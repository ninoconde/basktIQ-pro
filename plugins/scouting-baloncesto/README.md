# scouting-baloncesto

Plugin de Claude Code para entrenadores: scouting de jugadoras y rivales, planes de partido, Cuatro Factores, análisis de play-by-play y planificación de entrenamientos. Usa las mismas fórmulas que la app BasktIQ Pro (`context/GameContext.tsx`).

## Instalación

```
/plugin marketplace add ninoconde/basktiq-pro
/plugin install scouting-baloncesto@basktiq
```

## Comandos

| Comando | Uso |
|---|---|
| `/scouting-baloncesto:scouting <jugadora o equipo> [datos]` | Informe de scouting |
| `/scouting-baloncesto:plan-partido <rival> [notas]` | Plan de partido de una página |
| `/scouting-baloncesto:cuatro-factores <box score>` | Cuatro Factores e interpretación |
| `/scouting-baloncesto:sesion <categoría> <duración> <objetivo> [notas]` | Sesión de entrenamiento lista para pista |
| `/scouting-baloncesto:microciclo <categoría> <días> <día de partido> [rival]` | Plan semanal orientado al partido |

## Skills (se activan solas según la tarea)

| Skill | Se activa cuando pides… |
|---|---|
| `scouting-baloncesto` | un scouting, un plan de partido, los Cuatro Factores o leer un box score |
| `analisis-play-by-play` | analizar el jugada a jugada: parciales, momentum, tiempos muertos, quintetos |
| `planificacion-entrenamiento` | una sesión, un microciclo o ejercicios |

Cada descripción indica también cuándo **no** activarse, para que no se pisen entre sí.

## Instalación automática en este repo

`.claude/settings.json` registra el marketplace `basktiq` y activa el plugin, así que Claude Code propone instalarlo al abrir el repo (tras aceptar la confianza de la carpeta).
