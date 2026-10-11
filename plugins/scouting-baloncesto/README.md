# scouting-baloncesto

Plugin de Claude Code para entrenadores: scouting de jugadoras y rivales, planes de partido y Cuatro Factores. Usa las mismas fórmulas que la app BasktIQ Pro (`context/GameContext.tsx`).

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

La skill `scouting-baloncesto` también se activa sola cuando pides un scouting en lenguaje natural.
