---
name: analisis-play-by-play
description: Analiza el play-by-play (jugada a jugada) de un partido de baloncesto para encontrar rachas, parciales, momentos de cambio, rendimiento por cuartos, efecto de tiempos muertos y cambios, y quintetos. Úsala cuando el usuario aporte un play-by-play o pregunte "dónde se perdió el partido", "qué pasó en el tercer cuarto", "cuándo se rompió el partido", "funcionó el tiempo muerto" o pida un análisis de momentum o de flujo del partido. No la uses si solo hay box score (usa scouting-baloncesto) ni para diseñar entrenamientos (usa planificacion-entrenamiento).
---

# Análisis de play-by-play

Objetivo: explicar **cuándo y por qué** cambió el partido, no repetir la secuencia de jugadas.

## Reglas

1. Reconstruye el marcador jugada a jugada. Si el texto no deja claro el valor de una canasta (1, 2 o 3), márcalo `[Suposición]` (la app BasktIQ Pro usa la misma heurística: "3"/"three" → triple, "free"/"FT" → libre, resto → 2).
2. Comprueba que el marcador reconstruido coincide con el final. Si no coincide, dilo antes de sacar conclusiones.
3. Etiqueta la confianza: `[Certeza]` (sale del PBP), `[Probable]`, `[Suposición]`.
4. No inventes jugadas ni minutos que no estén en los datos.

## Qué buscar

- **Parciales**: rachas de ≥ 8–0 o ventajas de ≥ 10 puntos en ≤ 4 minutos. Para cada una: minuto, quién anotó y qué la provocó (pérdidas, rebote ofensivo, tiros libres, triples).
- **Puntos de inflexión**: cambios de líder y la jugada que inició cada racha decisiva.
- **Por cuartos**: puntos, pérdidas y faltas de cada equipo; dónde se ganó o perdió.
- **Tiempos muertos y cambios**: diferencia en las 5 posesiones anteriores frente a las 5 posteriores. Con menos de 5 posesiones, avisa de que la muestra no vale.
- **Quintetos** (si los cambios lo permiten): +/- de cada quinteto con más de 3 minutos juntos.
- **Finales de cuarto y clutch** (últimos 5 minutos con diferencia ≤ 5).

## Formato

1. **Resumen en 3 líneas**: cómo se decidió el partido.
2. **Tabla de parciales** clave (minuto, parcial, causa).
3. **Por cuartos** (tabla).
4. **Tiempos muertos / cambios** que funcionaron y que no.
5. **3 lecciones** para el entrenamiento o el próximo partido.
6. **Datos que faltan**.
