# scouting-baloncesto

Plugin de Claude Code para entrenadores: scouting de jugadoras y rivales, planes de partido, Cuatro Factores y planificación de entrenamientos. Usa las mismas fórmulas que la app BasktIQ Pro (`context/GameContext.tsx`).

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

Las skills `scouting-baloncesto` y `planificacion-entrenamiento` también se activan solas cuando pides un scouting o un entrenamiento en lenguaje natural.
