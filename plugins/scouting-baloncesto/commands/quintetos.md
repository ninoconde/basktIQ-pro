---
description: +/- por quintetos e individual a partir del play-by-play de un partido (PDF, texto o imagen)
argument-hint: <ruta al PDF o PBP> <equipo a analizar>
---

Calcula el +/- por quintetos del equipo indicado en: $ARGUMENTS

1. **Lee el play-by-play** completo (todas las páginas) y el box score si está en el mismo documento.
2. **Transcribe a JSON** siguiendo el formato del ejemplo `${CLAUDE_PLUGIN_ROOT}/scripts/ejemplos/ualbany-cornell-2024-11-23.json`. Guárdalo en el directorio de trabajo como `quintetos-<equipo>-<fecha>.json`.
   - `titulares`: las 5 con asterisco (GS) en el box score.
   - `eventos`, **en el mismo orden que el PBP**: solo `sale`/`entra` del equipo analizado y `canasta` (canastas y tiros libres anotados) de **ambos** equipos con sus puntos (`lado`: `equipo` o `rival`).
   - Respeta el orden en el mismo segundo: si los tiros libres aparecen antes del cambio, van antes; si aparecen después, van después.
   - `final` y `minutos_box` del box score, para validar.
   - Usa el apellido tal como aparece en el PBP.
3. **Ejecuta**: `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/quintetos.py" <fichero.json>`
4. Si sale `ERROR DE DATOS`, corrige la transcripción (revisando el PBP en el punto indicado) y repite. **Nunca ajustes números a mano para que cuadre.**
5. Interpreta el resultado con la skill `analisis-play-by-play`:
   - Tabla de quintetos con más de 2 minutos e individual.
   - Qué quinteto funciona y cuál no, y por qué (cruza con los parciales del PBP).
   - Aviso de muestra: si ningún quinteto supera ~8 minutos, el +/- es un indicio, no una prueba.
   - Si hay `AVISOS` de minutos, menciónalos.
