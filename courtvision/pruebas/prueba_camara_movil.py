"""Prueba de la cámara móvil: la cámara gira y hace zoom siguiendo el juego sobre un suelo con textura.
Se calibra solo el primer fotograma y se mide cuánto se desvía la calibración arrastrada (en metros)
y si las posiciones de los jugadores siguen siendo correctas. El detector se sustituye por las cajas
reales: mide la calibración y la lógica, no la visión."""
import json, os, sys, tempfile
import cv2, numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # courtvision/
import courtvision as cv

AQUI = tempfile.mkdtemp(prefix="courtvision-movil-")
rng = np.random.default_rng(3)
W, H, L, A, ESC, M = 1280, 720, 28., 15., 40, 4.0  # px por metro de la textura, margen exterior (m)

# ---- suelo de la pista visto desde arriba: tablas de madera con vetas + líneas; fuera, grada
tw, th = int((L + 2 * M) * ESC), int((A + 2 * M) * ESC)
tex = np.full((th, tw, 3), (60, 60, 70), np.uint8)
tex += rng.integers(0, 40, (th, tw, 1), dtype=np.uint8)                       # grada: ruido oscuro
x0, y0 = int(M * ESC), int(M * ESC)
madera = np.full((int(A * ESC), int(L * ESC), 3), (120, 170, 210), np.int16)
for i in range(0, madera.shape[0], 9):                                         # tablas
    madera[i:i + 9] += rng.integers(-18, 18)
madera += cv2.GaussianBlur(rng.integers(-30, 30, madera.shape[:2], dtype=np.int16).astype(np.float32), (0, 0), 2)[..., None].astype(np.int16)
tex[y0:y0 + madera.shape[0], x0:x0 + madera.shape[1]] = np.clip(madera, 0, 255).astype(np.uint8)
P = lambda x, y: (int((M + x) * ESC), int((M + A - y) * ESC))                 # metros -> píxel de textura
blanco = (245, 245, 245)
cv2.rectangle(tex, P(0, 0), P(L, A), blanco, 3)
cv2.line(tex, P(L / 2, 0), P(L / 2, A), blanco, 3)
cv2.circle(tex, P(L / 2, A / 2), int(1.8 * ESC), blanco, 3)
for xa, s in ((0, 1), (L, -1)):
    cv2.rectangle(tex, P(xa, A / 2 - 2.45), P(xa + s * 5.8, A / 2 + 2.45), blanco, 3)
    cv2.ellipse(tex, P(xa + s * 1.575, A / 2), (int(6.75 * ESC),) * 2, 0, -78 if s == 1 else 102, 78 if s == 1 else 258, blanco, 3)
T_tex = np.array([[ESC, 0, M * ESC], [0, -ESC, (M + A) * ESC], [0, 0, 1]], np.float64)   # pista -> textura

# ---- cámara: desde la grada, gira de una canasta a la otra y hace algo de zoom
fps, dur = 25, 40
T = np.arange(fps * dur) / fps
def H_pista_a_img(t):
    cx = 14 + 7.5 * np.sin(2 * np.pi * t / 20)                 # centro de la vista (m)
    ancho = 15 + 3 * np.sin(2 * np.pi * t / 13)                # zoom: metros visibles abajo
    cerca, lejos = (cx - ancho / 2, -1.0), (cx + ancho / 2, -1.0)
    fondo_i, fondo_d = (cx - ancho * .62, A + 1.5), (cx + ancho * .62, A + 1.5)
    src = np.float32([cerca, lejos, fondo_d, fondo_i])
    dst = np.float32([[0, H], [W, H], [W * .92, 60], [W * .08, 60]])
    return cv2.getPerspectiveTransform(src, dst).astype(np.float64)

# ---- 10 jugadores con trayectorias suaves
COL = {"A": (40, 40, 200), "B": (200, 120, 30)}
tray = {}
for j in range(10):
    f1, f2, ph = rng.uniform(.05, .25, 2), rng.uniform(.3, .6, 2), rng.uniform(0, 6.3, 4)
    x = 14 + 9 * np.sin(f1[0] * T + ph[0]) + 2 * np.sin(f2[0] * T + ph[1])
    y = 7.5 + 4.5 * np.sin(f1[1] * T + ph[2]) + 1.5 * np.sin(f2[1] * T + ph[3])
    tray[j] = ("A" if j < 5 else "B", np.stack([x, y], 1))

cajas_gt, verdad = [], []
vw = cv2.VideoWriter(os.path.join(AQUI, "movil.mp4"), cv2.VideoWriter_fourcc(*"mp4v"), fps, (W, H))
for i, t in enumerate(T):
    Hp = H_pista_a_img(t)
    fr = cv2.warpPerspective(tex, Hp @ np.linalg.inv(T_tex), (W, H), borderValue=(50, 50, 55))
    cajas, pos = [], []
    for j in sorted(tray, key=lambda k: -tray[k][1][i, 1]):
        eq, p = tray[j]
        px, py = cv2.perspectiveTransform(np.float64([[p[i]]]), Hp)[0, 0]
        if not (0 <= px < W and 70 <= py < H):
            continue
        alto = 60 + 140 * (py / H); ancho = alto * .38
        a0, b0, a1, b1 = px - ancho / 2, py - alto, px + ancho / 2, py
        cv2.rectangle(fr, (int(a0), int(b0 + alto * .18)), (int(a1), int(b0 + alto * .55)), COL[eq], -1)
        cv2.rectangle(fr, (int(a0 + ancho * .15), int(b0 + alto * .55)), (int(a1 - ancho * .15), int(b1)), (40, 40, 40), -1)
        cv2.circle(fr, (int(px), int(b0 + alto * .09)), int(alto * .09), (150, 180, 220), -1)
        if rng.random() > .08:
            n = rng.normal(0, 2, 4)
            cajas.append([a0 + n[0], b0 + n[1], a1 + n[2], b1 + n[3]]); pos.append(p[i])
    cv2.rectangle(fr, (20, 20), (330, 70), (20, 20, 20), -1)                    # rótulo fijo (marcador de la emisión)
    cv2.putText(fr, "EST 0 - 0 LAS  10:00", (30, 55), cv2.FONT_HERSHEY_SIMPLEX, .8, (255, 255, 255), 2)
    cajas_gt.append(np.array(cajas, np.float32).reshape(-1, 4)); verdad.append(np.array(pos).reshape(-1, 2))
    vw.write(fr)
vw.release()

class Falso:
    def __call__(self, img, indice):
        c = cajas_gt[indice]
        return {0: (c, np.full(len(c), .9, np.float32)), 32: (np.zeros((0, 4)), np.zeros(0))}

# calibración del primer fotograma con 4 puntos visibles (zona izquierda y círculo central, si se ven)
ref = cv.puntos_pista("fiba")
H0 = H_pista_a_img(0)
cal = []
for nombre in ("zona_i_fondo_abajo", "zona_i_tl_abajo", "zona_i_tl_arriba", "zona_i_fondo_arriba",
               "medio_i", "circulo_abajo", "circulo_arriba", "esquina_ii", "esquina_id"):
    x, y = cv2.perspectiveTransform(np.float64([[ref[nombre]]]), H0)[0, 0]
    if 0 <= x < W and 70 <= y < H:
        cal.append([float(x), float(y), nombre])
assert len(cal) >= 4, cal

# registro de la calibración estimada en cada fotograma analizado
estimadas = []
original = cv.Camara.actualizar
def registrar(self, img, t, cajas, L_, A_):
    ok = original(self, img, t, cajas, L_, A_)
    estimadas.append((t, self.H.copy()))
    return ok
cv.Camara.actualizar = registrar

cfg = {"pista": "fiba", "camara": "movil", "calibracion": cal}
calidad, met = cv.procesar(os.path.join(AQUI, "movil.mp4"), cfg, os.path.join(AQUI, "salida"), 10, detector=Falso())

# error de calibración: rejilla de píxeles del suelo proyectada con la homografía estimada y con la real
xs, ys = np.meshgrid(np.linspace(100, W - 100, 8), np.linspace(300, H - 20, 5))
rejilla = np.stack([xs.ravel(), ys.ravel()], 1).reshape(-1, 1, 2)
errores = []
for t, He in estimadas:
    Hr = np.linalg.inv(H_pista_a_img(t))
    e = cv2.perspectiveTransform(rejilla, He) - cv2.perspectiveTransform(rejilla, Hr)
    errores.append(float(np.median(np.linalg.norm(e.reshape(-1, 2), axis=1))))
errores = np.array(errores)
print(json.dumps(calidad, ensure_ascii=False))
print(f"error de calibración (m): mediana {np.median(errores):.2f}, p95 {np.percentile(errores, 95):.2f}, "
      f"final {errores[-1]:.2f} tras {dur} s")
assert calidad["fotogramas_sin_calibracion_fiable"] <= 0.05 * calidad["fotogramas"], "demasiados fotogramas sin calibrar"
assert np.percentile(errores, 95) < 0.5, "la calibración arrastrada se desvía más de medio metro"
print("OK · resultados en", AQUI)

# pureza de las identidades: cada id final debería ser siempre el mismo jugador real
import csv
filas = list(csv.DictReader(open(os.path.join(AQUI, "salida", "trayectorias.csv"))))
por_id = {}
for r in filas:
    i = int(round(float(r["t"]) * fps))
    xy = np.array([float(r["x_m"]), float(r["y_m"])])
    real = min(tray, key=lambda j: np.linalg.norm(tray[j][1][i] - xy))
    por_id.setdefault(r["id"], []).append(real)
pureza = sum(max(np.bincount(v)) for v in por_id.values()) / len(filas)
print(f"identidades: {len(por_id)} (antes de unir tramos: {calidad['ids_antes_de_unir_tramos']}); pureza {100 * pureza:.1f} %")
assert pureza > 0.95, "las uniones de tramos mezclan jugadores"
