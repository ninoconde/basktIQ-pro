---
name: scouting-baloncesto
description: Método de scouting de baloncesto (jugadoras, rivales, self-scouting) que combina estadística avanzada con análisis táctico. Úsala cuando el usuario pida un informe de scouting, analizar a una jugadora o a un equipo rival, preparar un plan de partido, calcular los Cuatro Factores, interpretar un box score o proyectar a una jugadora (p. ej. a la NCAA). No la uses para analizar el play-by-play jugada a jugada (usa analisis-play-by-play) ni para diseñar entrenamientos (usa planificacion-entrenamiento).
---

# Scouting de baloncesto

Objetivo: convertir datos (box score, play-by-play, vídeo descrito, contexto) en **ventajas accionables** para el próximo partido. Un informe que no cambia ninguna decisión del entrenador no sirve.

## Reglas

1. **Etiqueta la confianza** de cada afirmación relevante:
   - `[Certeza]` sale directamente de los datos aportados.
   - `[Probable]` inferencia fuerte a partir de los datos.
   - `[Suposición]` rellena un hueco; di qué dato la confirmaría.
2. **Nunca inventes estadísticas.** Si falta un dato, escribe "sin dato" y pídelo al final en *Datos que faltan*.
3. **Tamaño de muestra.** Con menos de 5 partidos o menos de 50 tiros, avisa de que los porcentajes son poco fiables.
4. **Contexto antes que números**: nivel de la competición, ritmo, rol en el equipo, minutos.
5. Escribe en español, frases cortas, lenguaje de banquillo.

## Fórmulas (mismas que usa la app BasktIQ Pro)

| Métrica | Fórmula |
|---|---|
| eFG% | (TC + 0,5·T3) / TCI |
| TOV% | PER / (TCI + 0,44·TLI + PER) |
| ORB% | RO / (RO + RD rival) |
| FTr | TL / TCI |
| TS% | PTS / (2·(TCI + 0,44·TLI)) |
| Posesiones | TCI − RO + PER + 0,44·TLI |
| ORtg / DRtg | 100·PTS / posesiones (anotados / recibidos) |
| USG% (aprox.) | (TCI + 0,44·TLI + PER) jugadora / mismo total del equipo × (min equipo/5) / min jugadora |

Peso orientativo de los Cuatro Factores (Oliver): tiro 40 %, pérdidas 25 %, rebote 20 %, tiros libres 15 %.

## Estructuras de entregable

### Jugadora
1. **Ficha**: nombre, posición, altura, edad, equipo, competición, minutos.
2. **Perfil estadístico**: TS%, eFG%, USG%, AST/PER, RO%/RD%, FTr. Compara con la media de la liga si hay dato.
3. **Cómo anota**: zonas, tipo de acción (P&R, aislamiento, post, catch & shoot, transición), mano dominante.
4. **Puntos débiles explotables**.
5. **Cómo defenderla**: 3 claves concretas (p. ej. "pasar por debajo del bloqueo", "negar recepción en codo").
6. **Proyección** (si se pide, p. ej. NCAA): nivel realista y qué le falta.

### Rival
1. **Identidad**: ritmo (posesiones), ORtg/DRtg, Cuatro Factores ataque y defensa.
2. **Jugadoras clave** (máx. 3) con una línea cada una.
3. **Sistemas**: ataque posicional, salidas de banda/fondo, defensa (individual/zona/presión).
4. **Dónde ganan / dónde pierden** según los Cuatro Factores.
5. **Plan**: 3 claves en ataque, 3 en defensa, 1 ajuste de rebote.

### Self-scouting
Igual que *Rival*, aplicado al propio equipo, terminando con "qué nos haría un buen entrenador rival".

Cierra siempre con **Datos que faltan** (lista corta) para mejorar el informe.
