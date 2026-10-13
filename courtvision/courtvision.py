#!/usr/bin/env python3
"""CourtVision V0.2 (prueba técnica): vídeo -> jugadores, balón, trayectorias y métricas.

Uso:
  python courtvision.py video.mp4 --config config.json --salida carpeta [--fps 10] [--inicio 0] [--duracion 600]
  python courtvision.py video.mp4 --fotograma 30 --salida carpeta     # saca un fotograma para calibrar

config.json:
  {"pista": "fiba" | "ncaa",
   "camara": "fija" | "movil",                         # movil: la cámara gira o hace zoom siguiendo el juego
   "calibracion": [[x_px, y_px, "esquina_ii"], ...]   # 4+ puntos del primer fotograma; nombres en puntos_pista()
   "recalibraciones": [{"t": 95.0, "calibracion": [...]}],  # opcional (cámara móvil): corrige la deriva
   "colores": {"A": [b, g, r], "B": [b, g, r]}         # opcional: color de camiseta de cada equipo
   "excluir_dorsales": []}                             # reservado para la revisión de identidades

Detector: YOLOX-M (Apache 2.0) en ONNX; seguimiento: ByteTrack (MIT, vía supervision).
"""
import argparse
import csv
import json
import os
import warnings

import cv2
import numpy as np
import onnxruntime as ort
import supervision as sv
from sklearn.cluster import KMeans

AQUI = os.path.dirname(os.path.abspath(__file__))
warnings.filterwarnings("ignore", message=".*ByteTrack.*", category=FutureWarning)
PISTAS = {"fiba": (28.0, 15.0), "ncaa": (28.65, 15.24)}  # largo x ancho en metros (NCAA/NJCAA: 94 x 50 pies)
ZONA = {"fiba": (4.9, 5.8), "ncaa": (3.66, 5.79)}         # ancho de la zona y distancia del tiro libre al fondo (m)
V_MAX = 9.0  # m/s: por encima es un salto de identidad, no una carrera


def puntos_pista(pista):
    L, A = PISTAS[pista]
    # x a lo largo (0 = fondo izquierdo), y a lo ancho (0 = banda de abajo en la imagen, la más cercana a la cámara)
    z, tl = ZONA[pista]
    pts = {
        "esquina_ii": (0, 0), "esquina_id": (0, A), "esquina_di": (L, 0), "esquina_dd": (L, A),
        "medio_i": (L / 2, 0), "medio_d": (L / 2, A), "centro": (L / 2, A / 2),
        "circulo_abajo": (L / 2, A / 2 - 1.8), "circulo_arriba": (L / 2, A / 2 + 1.8),
    }
    # zona: «zona_i_fondo_abajo» = esquina de la zona izquierda en la línea de fondo, lado cercano a la cámara
    for lado, x0, s in (("i", 0, 1), ("d", L, -1)):
        for nombre, y in (("abajo", A / 2 - z / 2), ("arriba", A / 2 + z / 2)):
            pts[f"zona_{lado}_fondo_{nombre}"] = (x0, y)
            pts[f"zona_{lado}_tl_{nombre}"] = (x0 + s * tl, y)
    return pts


# ---------------- Detector YOLOX (ONNX oficial, salida sin decodificar)
class Detector:
    PERSONA, BALON = 0, 32

    def __init__(self, modelo, tam=640):
        self.s = ort.InferenceSession(modelo, providers=["CPUExecutionProvider"])
        self.entrada = self.s.get_inputs()[0].name
        self.tam = tam
        grids, strides = [], []
        for st in (8, 16, 32):
            n = tam // st
            xv, yv = np.meshgrid(np.arange(n), np.arange(n))
            grids.append(np.stack((xv, yv), 2).reshape(-1, 2))
            strides.append(np.full((n * n, 1), st))
        self.grid, self.stride = np.concatenate(grids), np.concatenate(strides)

    def __call__(self, img, indice=None, umbral=0.3):
        h, w = img.shape[:2]
        r = min(self.tam / h, self.tam / w)
        lienzo = np.full((self.tam, self.tam, 3), 114, np.uint8)
        lienzo[: int(h * r), : int(w * r)] = cv2.resize(img, (int(w * r), int(h * r)))
        x = lienzo.transpose(2, 0, 1)[None].astype(np.float32)
        out = self.s.run(None, {self.entrada: x})[0][0]
        out[:, :2] = (out[:, :2] + self.grid) * self.stride
        out[:, 2:4] = np.exp(out[:, 2:4]) * self.stride
        cajas = np.stack([out[:, 0] - out[:, 2] / 2, out[:, 1] - out[:, 3] / 2,
                          out[:, 0] + out[:, 2] / 2, out[:, 1] + out[:, 3] / 2], 1) / r
        res = {}
        for clase in (self.PERSONA, self.BALON):
            conf = out[:, 4] * out[:, 5 + clase]
            m = conf > (umbral if clase == self.PERSONA else 0.15)
            b, c = cajas[m], conf[m]
            keep = cv2.dnn.NMSBoxes([[float(bb[0]), float(bb[1]), float(bb[2] - bb[0]), float(bb[3] - bb[1])] for bb in b], c.tolist(), 0.0, 0.5)
            keep = np.array(keep).reshape(-1).astype(int)
            res[clase] = (b[keep], c[keep])
        return res


# ---------------- Utilidades
def pies(cajas):
    return np.stack([(cajas[:, 0] + cajas[:, 2]) / 2, cajas[:, 3]], 1)


def a_pista(H, pts):
    if len(pts) == 0:
        return np.zeros((0, 2))
    return cv2.perspectiveTransform(pts.reshape(-1, 1, 2).astype(np.float32), H).reshape(-1, 2)


class Camara:
    """Mantiene la homografía imagen -> pista. Con cámara móvil, la arrastra de un fotograma al
    siguiente con el movimiento del suelo (ORB + RANSAC, sin jugadores) y la corrige con recalibraciones."""

    def __init__(self, cfg, ref):
        self.ref, self.movil = ref, cfg.get("camara", "fija") == "movil"
        self.H = self._de_puntos(cfg["calibracion"])
        self.recal = sorted(cfg.get("recalibraciones", []), key=lambda r: r["t"])
        self.orb = cv2.ORB_create(1500)
        self.previo = None
        self.perdidos = 0

    def _de_puntos(self, cal):
        img = np.array([p[:2] for p in cal], np.float32)
        pis = np.array([self.ref[p[2]] for p in cal], np.float32)
        H, _ = cv2.findHomography(img, pis)
        return H

    def actualizar(self, img, t, cajas, L, A):
        """Devuelve True si la calibración de este fotograma es fiable."""
        gris = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        if self.recal and t >= self.recal[0]["t"] - 1e-6:
            self.H = self._de_puntos(self.recal.pop(0)["calibracion"])
            self.previo = None
        fiable = True
        if self.movil and self.previo is not None:
            g_prev, m_prev = self.previo
            kp1, d1 = self.orb.detectAndCompute(g_prev, m_prev)
            kp2, d2 = self.orb.detectAndCompute(gris, self._mascara(gris.shape, cajas, L, A))
            fiable = False
            if d1 is not None and d2 is not None and len(kp1) >= 20 and len(kp2) >= 20:
                pares = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True).match(d1, d2)
                if len(pares) >= 20:
                    a = np.float32([kp1[m.queryIdx].pt for m in pares])
                    b = np.float32([kp2[m.trainIdx].pt for m in pares])
                    G, inl = cv2.findHomography(a, b, cv2.RANSAC, 3.0)
                    if G is not None and inl.sum() >= 15:
                        self.H = self.H @ np.linalg.inv(G)  # pista <- previo <- actual
                        fiable = True
            if not fiable:
                self.perdidos += 1
        self.previo = (gris, self._mascara(gris.shape, cajas, L, A))
        return fiable

    def _mascara(self, forma, cajas, L, A):
        """Solo el suelo de la pista (con 1 m de margen), sin jugadores: el público y los rótulos se mueven distinto."""
        m = np.zeros(forma, np.uint8)
        esquinas = np.float32([[-1, -1], [-1, A + 1], [L + 1, A + 1], [L + 1, -1]]).reshape(-1, 1, 2)
        poli = cv2.perspectiveTransform(esquinas, np.linalg.inv(self.H)).reshape(-1, 2)
        cv2.fillPoly(m, [poli.astype(np.int32)], 255)
        for x0, y0, x1, y1 in np.asarray(cajas).reshape(-1, 4).astype(int):
            cv2.rectangle(m, (x0 - 4, y0 - 4), (x1 + 4, y1 + 4), 0, -1)
        return m

    def dibujar_lineas(self, img, pista):
        """Superpone las líneas de la pista según la calibración actual: si no casan, la calibración ha derivado."""
        L, A = PISTAS[pista]
        Hi = np.linalg.inv(self.H)
        def linea(pts):
            q = cv2.perspectiveTransform(np.float32(pts).reshape(-1, 1, 2), Hi).reshape(-1, 2)
            cv2.polylines(img, [q.astype(np.int32)], False, (255, 0, 255), 1)
        linea([[0, 0], [0, A], [L, A], [L, 0], [0, 0]])
        linea([[L / 2, 0], [L / 2, A]])
        ang = np.linspace(0, 2 * np.pi, 40)
        linea(np.stack([L / 2 + 1.8 * np.cos(ang), A / 2 + 1.8 * np.sin(ang)], 1))


def color_camiseta(img, caja):
    x0, y0, x1, y1 = caja.astype(int)
    h = y1 - y0
    # franja del torso: entre el 20 % y el 50 % de la altura, centro horizontal
    rx0, rx1 = x0 + (x1 - x0) // 4, x1 - (x1 - x0) // 4
    zona = img[max(y0 + int(h * .2), 0):max(y0 + int(h * .5), 1), max(rx0, 0):max(rx1, 1)]
    if zona.size == 0:
        return None
    return np.median(zona.reshape(-1, 3), 0)


def dibujar_pista(pista, escala=30, margen=40):
    L, A = PISTAS[pista]
    W, Hh = int(L * escala) + 2 * margen, int(A * escala) + 2 * margen
    img = np.full((Hh, W, 3), (225, 236, 245), np.uint8)
    P = lambda x, y: (int(margen + x * escala), int(Hh - margen - y * escala))
    c = (60, 60, 60)
    cv2.rectangle(img, P(0, 0), P(L, A), c, 2)
    cv2.line(img, P(L / 2, 0), P(L / 2, A), c, 2)
    cv2.circle(img, P(L / 2, A / 2), int(1.8 * escala), c, 2)
    for x0, s in ((0, 1), (L, -1)):
        cv2.rectangle(img, P(x0, A / 2 - 2.45), P(x0 + s * 5.8, A / 2 + 2.45), c, 2)
        cv2.ellipse(img, P(x0 + s * 1.575, A / 2), (int(6.75 * escala),) * 2, 0, -78 if s == 1 else 102, 78 if s == 1 else 258, c, 2)
    return img, P


# ---------------- Proceso
def procesar(video, cfg, salida, fps_obj=10, inicio=0, duracion=None, modelo=None, detector=None):
    os.makedirs(salida, exist_ok=True)
    pista = cfg.get("pista", "fiba")
    camara = Camara(cfg, puntos_pista(pista))
    L, A = PISTAS[pista]

    cap = cv2.VideoCapture(video)
    fps_v = cap.get(cv2.CAP_PROP_FPS) or 25
    paso = max(1, round(fps_v / fps_obj))
    dt = paso / fps_v
    fps_obj = fps_v / paso  # fps real de análisis
    cap.set(cv2.CAP_PROP_POS_MSEC, inicio * 1000)
    det = detector or Detector(modelo or os.path.join(AQUI, "yolox_m.onnx"))
    tracker = sv.ByteTrack(track_activation_threshold=0.35, lost_track_buffer=int(3 * fps_obj),
                           minimum_matching_threshold=0.8, frame_rate=fps_obj)
    ancho, alto = int(cap.get(3)), int(cap.get(4))
    escritor = cv2.VideoWriter(os.path.join(salida, "superpuesto.mp4"), cv2.VideoWriter_fourcc(*"mp4v"), fps_obj, (ancho, alto))

    filas, balon, colores, n_frames, k = [], [], {}, 0, 0
    rastro, no_fiables = {}, 0
    while True:
        ok, img = cap.read()
        if not ok:
            break
        t = inicio + k / fps_v
        k += 1
        if duracion and t > inicio + duracion:
            break
        if (k - 1) % paso:
            continue
        n_frames += 1
        r = det(img, k - 1)
        cajas, conf = r[Detector.PERSONA]
        if not camara.actualizar(img, t, cajas, L, A):
            no_fiables += 1
        H = camara.H
        # solo personas con los pies dentro de la pista (+1 m): fuera quedan banquillo y público
        if len(cajas):
            pc = a_pista(H, pies(cajas))
            dentro = (pc[:, 0] > -1) & (pc[:, 0] < L + 1) & (pc[:, 1] > -1) & (pc[:, 1] < A + 1)
            cajas, conf = cajas[dentro], conf[dentro]
        d = sv.Detections(xyxy=cajas.astype(np.float32), confidence=conf.astype(np.float32),
                          class_id=np.zeros(len(cajas), int))
        d = tracker.update_with_detections(d)
        pc = a_pista(H, pies(d.xyxy)) if len(d) else np.zeros((0, 2))
        for caja, tid, (x, y) in zip(d.xyxy, d.tracker_id, pc):
            filas.append((n_frames, round(t, 2), int(tid), float(x), float(y)))
            col = color_camiseta(img, caja)
            if col is not None:
                colores.setdefault(int(tid), []).append(col)
            rastro.setdefault(int(tid), []).append((x, y))  # en metros: se reproyecta con la cámara actual
            cv2.rectangle(img, tuple(caja[:2].astype(int)), tuple(caja[2:].astype(int)), (0, 200, 255), 2)
            cv2.putText(img, str(tid), (int(caja[0]), int(caja[1]) - 4), cv2.FONT_HERSHEY_SIMPLEX, .6, (0, 200, 255), 2)
            q = np.float32(rastro[int(tid)][-int(2 * fps_obj):]).reshape(-1, 1, 2)
            pts = cv2.perspectiveTransform(q, np.linalg.inv(H)).reshape(-1, 2).astype(np.int32)
            cv2.polylines(img, [pts], False, (0, 200, 255), 1)
        bc, bconf = r[Detector.BALON]
        if len(bc):
            b = bc[np.argmax(bconf)]
            cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
            balon.append((n_frames, round(t, 2), float(cx), float(cy), float(bconf.max())))
            cv2.circle(img, (int(cx), int(cy)), 9, (0, 0, 255), 2)
        camara.dibujar_lineas(img, pista)
        escritor.write(img)
    escritor.release()
    cap.release()
    calidad, metricas = analizar(filas, balon, colores, n_frames, dt, cfg, salida, pista)
    calidad["camara"] = cfg.get("camara", "fija")
    calidad["fotogramas_sin_calibracion_fiable"] = no_fiables
    json.dump(dict(calidad=calidad, jugadores=metricas), open(os.path.join(salida, "metricas.json"), "w"), ensure_ascii=False, indent=1)
    return calidad, metricas


def asignar_equipos(colores, cfg):
    ids = [t for t, c in colores.items() if len(c) >= 5]
    if not ids:
        return {}
    med = np.array([np.median(colores[t], 0) for t in ids])
    lab = cv2.cvtColor(med[None].astype(np.uint8), cv2.COLOR_BGR2LAB)[0].astype(float)
    if "colores" in cfg:
        ref = {e: cv2.cvtColor(np.uint8([[c]]), cv2.COLOR_BGR2LAB)[0, 0].astype(float) for e, c in cfg["colores"].items()}
        return {t: min(ref, key=lambda e: np.linalg.norm(lab[i] - ref[e])) for i, t in enumerate(ids)}
    km = KMeans(2, n_init=10, random_state=0).fit(lab)
    return {t: "AB"[l] for t, l in zip(ids, km.labels_)}


def unir_tramos(filas, equipos, hueco_max=8.0, v_max=7.0, holgura=1.5, margen=2.0):
    """Une identidades que se cortan (jugador que sale de plano o se tapa) cuando hay un único candidato
    claro: mismo equipo, el tramo anterior ya terminó y la distancia es alcanzable corriendo (v_max)."""
    tramos = {}
    for f, t, tid, x, y in filas:
        tr = tramos.setdefault(tid, dict(t0=t, t1=t, p0=(x, y), p1=(x, y)))
        if t < tr["t0"]:
            tr["t0"], tr["p0"] = t, (x, y)
        if t > tr["t1"]:
            tr["t1"], tr["p1"] = t, (x, y)
    cadenas = []          # [id_final, último tramo]
    destino = {}
    for tid in sorted(tramos, key=lambda k: tramos[k]["t0"]):
        tr, eq = tramos[tid], equipos.get(tid, "?")
        cand = []
        for c in cadenas:
            prev = tramos[c[1]]
            hueco = tr["t0"] - prev["t1"]
            if eq == "?" or equipos.get(c[1], "?") != eq or not (0 < hueco <= hueco_max):
                continue
            d = float(np.hypot(tr["p0"][0] - prev["p1"][0], tr["p0"][1] - prev["p1"][1]))
            if d <= v_max * hueco + holgura:
                cand.append((d / (hueco + 1e-6) + d * 0.1, c))
        cand.sort(key=lambda z: z[0])
        if cand and (len(cand) == 1 or cand[1][0] >= margen * cand[0][0] + 0.5):
            cand[0][1][1] = tid
            destino[tid] = cand[0][1][0]
        else:
            cadenas.append([tid, tid])
            destino[tid] = tid
    return [(f, t, destino[tid], x, y) for f, t, tid, x, y in filas], destino


def analizar(filas, balon, colores, n_frames, dt, cfg, salida, pista):
    L, A = PISTAS[pista]
    equipos = asignar_equipos(colores, cfg)
    ids_seguidor = len({r[2] for r in filas})
    if cfg.get("unir_tramos", True):
        filas, destino = unir_tramos(filas, equipos)
        equipos = {destino[t]: e for t, e in equipos.items()}
    por_id = {}
    for f, t, tid, x, y in filas:
        por_id.setdefault(tid, []).append((f, t, x, y))
    metricas = []
    for tid, pts in por_id.items():
        pts.sort()
        f = np.array([p[0] for p in pts]); xy = np.array([[p[2], p[3]] for p in pts])
        if len(xy) >= 5:  # suavizado: media móvil de 5 muestras
            ker = np.ones(5) / 5
            xy = np.stack([np.convolve(np.pad(xy[:, i], 2, mode="edge"), ker, "valid") for i in (0, 1)], 1)
        dist, vmax, saltos = 0.0, 0.0, 0
        for i in range(1, len(xy)):
            huecos = f[i] - f[i - 1]
            dd = float(np.linalg.norm(xy[i] - xy[i - 1]))
            v = dd / (huecos * dt)
            if v > V_MAX:
                saltos += 1
                continue
            if huecos <= 3:
                dist += dd
                vmax = max(vmax, v)
        tiempo = len(pts) * dt
        metricas.append(dict(id=tid, equipo=equipos.get(tid, "?"), segundos=round(tiempo, 1), distancia_m=round(dist, 1),
                             vel_media_ms=round(dist / tiempo, 2) if tiempo else 0, vel_max_ms=round(float(vmax), 2), saltos=saltos))
    metricas.sort(key=lambda m: -m["segundos"])

    with open(os.path.join(salida, "trayectorias.csv"), "w", newline="") as fh:
        w = csv.writer(fh); w.writerow(["fotograma", "t", "id", "equipo", "x_m", "y_m"])
        for f, t, tid, x, y in filas:
            w.writerow([f, t, tid, equipos.get(tid, "?"), round(x, 2), round(y, 2)])
    with open(os.path.join(salida, "balon.csv"), "w", newline="") as fh:
        w = csv.writer(fh); w.writerow(["fotograma", "t", "x_px", "y_px", "confianza"]); w.writerows(balon)

    # mapas de calor por equipo (celdas de 1 m)
    for eq in sorted(set(equipos.values())) or ["?"]:
        rej = np.zeros((int(np.ceil(A)), int(np.ceil(L))))
        for f, t, tid, x, y in filas:
            if equipos.get(tid, "?") == eq and 0 <= x < L and 0 <= y < A:
                rej[int(y), int(x)] += 1
        img, P = dibujar_pista(pista)
        if rej.max() > 0:
            norm = (rej / rej.max() * 255).astype(np.uint8)
            col = cv2.applyColorMap(norm, cv2.COLORMAP_JET)
            capa = img.copy()
            for yy in range(rej.shape[0]):
                for xx in range(rej.shape[1]):
                    if rej[yy, xx] > 0:
                        cv2.rectangle(capa, P(xx, yy + 1), P(xx + 1, yy), col[yy, xx].tolist(), -1)
            img = cv2.addWeighted(capa, .55, img, .45, 0)
            lineas = dibujar_pista(pista)[0]
            img = np.where(lineas < 100, lineas, img)
        cv2.imwrite(os.path.join(salida, f"calor_equipo_{eq}.png"), img)

    largos = [m["segundos"] for m in metricas]
    calidad = dict(
        fotogramas=n_frames, segundos_analizados=round(n_frames * dt, 1),
        ids_distintos=len(metricas), ids_antes_de_unir_tramos=ids_seguidor,
        ids_esperados="10 en pista (5 + 5); cada id de más es una identidad partida o un falso positivo",
        jugadores_medios_por_fotograma=round(len(filas) / n_frames, 2) if n_frames else 0,
        duracion_media_id_s=round(float(np.mean(largos)), 1) if largos else 0,
        ids_de_mas_de_30s=sum(1 for s in largos if s >= 30),
        balon_detectado_pct=round(100 * len(balon) / n_frames, 1) if n_frames else 0,
        saltos_de_velocidad=sum(m["saltos"] for m in metricas),
    )
    json.dump(dict(calidad=calidad, jugadores=metricas), open(os.path.join(salida, "metricas.json"), "w"), ensure_ascii=False, indent=1)
    return calidad, metricas


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video")
    ap.add_argument("--config")
    ap.add_argument("--salida", default="salida")
    ap.add_argument("--fps", type=float, default=10)
    ap.add_argument("--inicio", type=float, default=0)
    ap.add_argument("--duracion", type=float)
    ap.add_argument("--fotograma", type=float, help="segundo del que sacar un fotograma para calibrar")
    a = ap.parse_args()
    if a.fotograma is not None:
        os.makedirs(a.salida, exist_ok=True)
        cap = cv2.VideoCapture(a.video); cap.set(cv2.CAP_PROP_POS_MSEC, a.fotograma * 1000)
        ok, img = cap.read()
        h, w = img.shape[:2]
        for x in range(0, w, 100):
            cv2.line(img, (x, 0), (x, h), (255, 255, 255), 1); cv2.putText(img, str(x), (x + 2, 14), 0, .4, (255, 255, 255), 1)
        for y in range(0, h, 100):
            cv2.line(img, (0, y), (w, y), (255, 255, 255), 1); cv2.putText(img, str(y), (2, y - 2), 0, .4, (255, 255, 255), 1)
        cv2.imwrite(os.path.join(a.salida, "fotograma_calibracion.png"), img)
        print("fotograma ->", os.path.join(a.salida, "fotograma_calibracion.png"), f"({w}x{h})")
        return
    cfg = json.load(open(a.config))
    calidad, metricas = procesar(a.video, cfg, a.salida, a.fps, a.inicio, a.duracion)
    print(json.dumps(calidad, ensure_ascii=False, indent=1))
    for m in metricas[:14]:
        print(m)


if __name__ == "__main__":
    main()
