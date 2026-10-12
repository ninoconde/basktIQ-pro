"""Prueba de la cadena (seguimiento, pista, equipos, métricas) con trayectorias conocidas.
El detector se sustituye por las cajas reales con ruido y huecos: mide la lógica, no la visión."""
import json, sys, os, tempfile
import cv2, numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # courtvision/
AQUI = tempfile.mkdtemp(prefix="courtvision-prueba-")  # nada se escribe en el repositorio
import courtvision as cv
rng = np.random.default_rng(1)
W, H, L, A = 1280, 720, 28., 15.
img_c = np.float32([[60, 660], [300, 250], [1220, 660], [980, 250]])
Hp = cv2.getPerspectiveTransform(np.float32([[0, 0], [0, A], [L, 0], [L, A]]), img_c)
fps, dur = 25, 60; T = np.arange(fps * dur) / fps
COL = {"A": (40, 40, 200), "B": (200, 120, 30)}
# 10 jugadores: 5 + 5, trayectorias suaves (sumas de senos) dentro de la pista
tray = {}
for j in range(10):
    eq = "A" if j < 5 else "B"
    f1, f2, ph = rng.uniform(.05, .25, 2), rng.uniform(.3, .6, 2), rng.uniform(0, 6.3, 4)
    x = 14 + 9 * np.sin(f1[0] * T + ph[0]) + 2 * np.sin(f2[0] * T + ph[1])
    y = 7.5 + 4.5 * np.sin(f1[1] * T + ph[2]) + 1.5 * np.sin(f2[1] * T + ph[3])
    tray[j] = (eq, np.stack([x, y], 1))
real = {j: float(np.sum(np.linalg.norm(np.diff(v[1], axis=0), axis=1))) for j, v in tray.items()}
cajas_gt, fondo = [], np.full((H, W, 3), (170, 190, 205), np.uint8)
cv2.polylines(fondo, [img_c[[0, 1, 3, 2]].astype(np.int32)], True, (255, 255, 255), 3)
vw = cv2.VideoWriter(os.path.join(AQUI, "sintetico10.mp4"), cv2.VideoWriter_fourcc(*"mp4v"), fps, (W, H))
for i in range(len(T)):
    fr, cajas = fondo.copy(), []
    for j in sorted(tray, key=lambda k: -tray[k][1][i, 1]):
        eq, p = tray[j]
        px, py = cv2.perspectiveTransform(np.float32([[p[i]]]), Hp)[0, 0]
        alto = 150 - 70 * p[i, 1] / A; ancho = alto * .38
        x0, y0, x1, y1 = px - ancho / 2, py - alto, px + ancho / 2, py
        cv2.rectangle(fr, (int(x0), int(y0 + alto * .18)), (int(x1), int(y0 + alto * .55)), COL[eq], -1)   # camiseta
        cv2.rectangle(fr, (int(x0 + ancho * .15), int(y0 + alto * .55)), (int(x1 - ancho * .15), int(y1)), (40, 40, 40), -1)
        cv2.circle(fr, (int(px), int(y0 + alto * .09)), int(alto * .09), (150, 180, 220), -1)
        if rng.random() > .08:   # 8 % de fallos del detector
            n = rng.normal(0, 2, 4)
            cajas.append([x0 + n[0], y0 + n[1], x1 + n[2], y1 + n[3]])
    cajas_gt.append(np.array(cajas, np.float32).reshape(-1, 4))
    vw.write(fr)
vw.release()

class Falso:
    def __call__(self, img, indice):
        c = cajas_gt[indice]
        return {0: (c, np.full(len(c), .9, np.float32)), 32: (np.zeros((0, 4)), np.zeros(0))}

cfg = {"pista": "fiba", "calibracion": [[60, 660, "esquina_ii"], [300, 250, "esquina_id"], [1220, 660, "esquina_di"], [980, 250, "esquina_dd"]]}
calidad, met = cv.procesar(os.path.join(AQUI, "sintetico10.mp4"), cfg, os.path.join(AQUI, "salida10"), 10, detector=Falso())
print(json.dumps(calidad, ensure_ascii=False))
tot_real = sum(real.values()); tot_med = sum(m["distancia_m"] for m in met)
print(f"distancia total real {tot_real:.0f} m, medida {tot_med:.0f} m ({100*(tot_med/tot_real-1):+.1f} %)")
print("equipos por id:", {m["id"]: m["equipo"] for m in met})
print("reales por jugador:", sorted(round(v) for v in real.values()))
print("medidas por id (los 10 más largos):", sorted(m["distancia_m"] for m in met)[-10:])

assert calidad["ids_distintos"] == 10, "cada jugador debe conservar una sola identidad"
assert sorted(m["equipo"] for m in met) == ["A"] * 5 + ["B"] * 5, "los equipos deben salir 5 y 5"
assert abs(tot_med / tot_real - 1) < 0.05, "la distancia debe salir con menos de un 5 % de error"
print("OK · resultados en", AQUI)
