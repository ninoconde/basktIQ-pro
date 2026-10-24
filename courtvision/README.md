# CourtVision V0.2 — prueba técnica

Convierte un vídeo de baloncesto (cámara fija, o cámara que gira y hace zoom siguiendo el juego) en datos: jugadores detectados,
trayectorias sobre la pista en metros, balón (aproximado), mapas de calor por equipo, distancia,
velocidad y tiempo en pista, más un informe de calidad para saber si el resultado es fiable.

Todavía no detecta eventos (tiros, rebotes…) ni sistemas tácticos: esto es la Fase 1.

## Instalación

```bash
cd courtvision
python3 -m venv venv && ./venv/bin/pip install -r requirements.txt
curl -L -o yolox_m.onnx https://github.com/Megvii-BaseDetection/YOLOX/releases/download/0.1.1rc0/yolox_m.onnx
```

- Detector: **YOLOX-M** (licencia Apache 2.0, apta para un producto de pago). No se usan los YOLO de
  Ultralytics porque su licencia AGPL-3.0 obligaría a publicar el código o a comprar licencia.
- Seguimiento: **ByteTrack** (MIT) a través de `supervision`.

## Uso

1. **Sacar un fotograma con rejilla** para leer las coordenadas de las esquinas de la pista:

   ```bash
   ./venv/bin/python courtvision.py partido.mp4 --fotograma 30 --salida salida
   ```

2. **Escribir `config.json`** con al menos 4 puntos de la pista que se vean en ese fotograma.
   Nombres disponibles: `esquina_ii`, `esquina_id`, `esquina_di`, `esquina_dd`, `medio_i`, `medio_d`,
   `centro`, `circulo_abajo`, `circulo_arriba` y las esquinas de cada zona: `zona_i_fondo_abajo`,
   `zona_i_fondo_arriba`, `zona_i_tl_abajo`, `zona_i_tl_arriba` (y lo mismo con `zona_d_…`).
   «i/d» = fondo izquierdo/derecho visto desde la cámara; «abajo» = lado cercano a la cámara;
   «tl» = línea de tiros libres:

   ```json
   {"pista": "fiba",
    "calibracion": [[60, 660, "esquina_ii"], [300, 250, "esquina_id"],
                    [1220, 660, "esquina_di"], [980, 250, "esquina_dd"]],
    "colores": {"A": [40, 40, 200], "B": [200, 120, 30]}}
   ```

   `pista`: `fiba` (28 × 15 m) o `ncaa` (94 × 50 pies, también NJCAA). `colores` (BGR) es opcional;
   sin él, los equipos se separan solos por el color de la camiseta.

   **Cámara que sigue el juego:** añade `"camara": "movil"` y calibra el fotograma de `--inicio`.
   La calibración se arrastra fotograma a fotograma con el movimiento del suelo (sin jugadores, ni
   grada, ni rótulos). Si en el vídeo superpuesto las líneas moradas dejan de casar con las de la
   pista, añade una recalibración en ese segundo:
   `"recalibraciones": [{"t": 95.0, "calibracion": [[x, y, "centro"], ...]}]`.

3. **Procesar** (por ejemplo, 10 minutos desde el minuto 2):

   ```bash
   ./venv/bin/python courtvision.py partido.mp4 --config config.json --salida salida --inicio 120 --duracion 600
   ```

## Qué devuelve (`salida/`)

| Archivo | Contenido |
|---|---|
| `superpuesto.mp4` | El vídeo con cada jugador numerado, su rastro y el balón |
| `trayectorias.csv` | Posición de cada identidad en metros, fotograma a fotograma |
| `balon.csv` | Posición del balón en la imagen (cuando se detecta) |
| `calor_equipo_A.png`, `calor_equipo_B.png` | Mapas de calor por equipo (celdas de 1 m) |
| `metricas.json` | Por identidad: equipo, segundos, distancia, velocidad media y máxima; y el bloque `calidad` |

El bloque `calidad` es lo primero que hay que mirar: `ids_distintos` frente a los 10 jugadores en
pista (cada identidad de más es un jugador «partido»), `balon_detectado_pct`, `saltos_de_velocidad`
y, con cámara móvil, `fotogramas_sin_calibracion_fiable`. En `superpuesto.mp4`, las líneas moradas
son la pista según la calibración: si no casan con las reales, los metros de ese tramo no valen.

Cuando una identidad se corta (jugador que sale de plano o queda tapado), se une con la siguiente
solo si hay un candidato claro del mismo equipo que llega corriendo a una velocidad posible
(`ids_antes_de_unir_tramos` dice cuántas había antes). Se desactiva con `"unir_tramos": false`.

## Prueba

```bash
./venv/bin/python pruebas/prueba_sintetica.py
```

- `prueba_sintetica.py`: cámara fija, 10 jugadores durante 60 s con trayectorias conocidas y un 8 %
  de detecciones perdidas; comprueba seguimiento, separación de equipos y distancia (error < 5 %).
- `prueba_camara_movil.py`: la cámara gira de canasta a canasta y hace zoom durante 40 s, con un
  rótulo fijo encima; comprueba que la calibración arrastrada no se desvía más de 0,5 m y que las
  identidades unidas mantienen más de un 95 % de pureza (hoy: 0,05 m de mediana y 97,8 %).

Las dos sustituyen al detector, así que **no** miden la visión: eso solo se puede medir con vídeo real.

## Límites conocidos

- Con cámara móvil, los jugadores fuera de plano no se ven: su distancia y su mapa de calor solo
  cuentan el tiempo en imagen, y al volver pueden recibir otra identidad.
- La calibración arrastrada se probó sobre un suelo simulado: los reflejos del parqué real y los
  cortes de realización (repeticiones, cambios de cámara) pueden romperla; en un corte hay que recalibrar.
- Las identidades son números, no dorsales: falta la pantalla de revisión donde el entrenador
  asigna cada número a una jugadora y une los tramos partidos.
- El balón usa la clase genérica «sports ball» de COCO: espera detecciones pobres.

## Datos personales

Los vídeos, modelos y resultados están excluidos del repositorio (`.gitignore`). Grabar y analizar a
jugadores requiere su consentimiento (en España, desde los 14 años lo da cada jugador; por debajo,
sus padres) y los del equipo rival y los árbitros también aparecen en el vídeo.
