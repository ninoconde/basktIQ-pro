---
description: Convierte un informe, scouting o sesión de entrenamiento en PDF con estilo "autopsia" (A4 y/o móvil), con gráficos y pizarras de pista
argument-hint: <qué informe> [a4|movil|ambos]
---

Genera el PDF de: $ARGUMENTS (formato por defecto: `ambos`).

1. **Contenido.** Usa el informe, scouting o sesión ya hecho en esta conversación (o el fichero indicado). No añadas datos nuevos. Cada afirmación lleva su etiqueta: `<span class="tag">Certeza</span>`, `<span class="tag probable">Probable</span>` o `<span class="tag suposicion">Suposición</span>`.
2. **Escribe solo el cuerpo HTML** (sin `<html>`, `<head>` ni `<style>`) en `informes/<tipo>-<equipo-o-jugador>-<fecha>.html`. Modelos:
   - Informe de partido: `${CLAUDE_PLUGIN_ROOT}/scripts/ejemplos/informe-ualbany-cornell.html`
   - Sesión de entrenamiento: `${CLAUDE_PLUGIN_ROOT}/scripts/ejemplos/sesion-rebote-ofensivo.html`
3. **Estructura de un informe de partido ("autopsia")**, cada parte en `<div class="seccion">` con `<p class="antetitulo">` y un `<h1>` que sea la conclusión, no el tema:
   portada (`.portada`) · resumen ejecutivo (KPIs + causas ordenadas por peso + lo que sí funcionó) · cronología (gráfico `evolucion` + `.fases`) · cuarto a cuarto (`barras`) · Cuatro Factores y descomposición del margen (`cascada`, que debe sumar exactamente el margen) · causas · quintetos (`barras_h`) y on/off (`on_off`) · ficha de jugador · plan de acción (medida, por qué, indicador de éxito, confianza) · anexos (acta, método y límites) · `.firma`.
   Las secciones que dependen del jugada a jugada (cronología, quintetos, on/off, rotaciones) **se omiten si no hay jugada a jugada**, diciéndolo en "Método y límites".
4. **Componentes** (`scripts/plantillas/base.css`): `.kpis`/`.kpi` (`.rojo`, `.azul`, `.oro`), tablas con `td.num` (número de causa), `td.n`, `.pos`/`.neg`, `.nota`, `.aviso`, `.fases`/`.fase`, `.card` (`.hd` con `<span>` a la derecha, `.bd`), `.objetivo`, `.cols`, `.cards`, `.solo-a4`/`.solo-movil` (tablas de más de 4 columnas: repítelas como tarjetas para el móvil), `.salto`, `.firma`.
5. **Gráficos:** `<div class="grafico" data-tipo="TIPO" data-datos='{JSON}'><p class="leyenda">…</p></div>`. Tipos y formato de datos en `${CLAUDE_PLUGIN_ROOT}/scripts/graficos.py`: `barras`, `cascada`, `evolucion`, `barras_h`, `on_off`, `pizarra`, `leyenda_pizarra`. Los datos de los gráficos salen del acta o del script de quintetos, nunca a ojo.
6. **Pizarras** (sesiones de entrenamiento y jugadas): `data-tipo="pizarra"` dentro de cada `.card.ejercicio`. Media pista FIBA en metros: x de −7,5 a 7,5, y desde la línea de fondo (0) hasta medio campo (14); la canasta está en (0; 1,575), el tiro libre en y = 5,8 y el triple a 6,75 m. Jugadores con número, defensores `X1…`, `T` para tirador o entrenador, balón, conos y acciones `movimiento`, `pase`, `bote`, `bloqueo`, `tiro`, con `num` para el orden. Para ejercicios bajo el aro usa `"alto": 4.8, "x": [-4, 4]` (zoom). Pon una `leyenda_pizarra` al principio de la sesión.
7. **Ejecuta:** `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/a_pdf.py" informes/<fichero>.html --formato <a4|movil|ambos> --salida informes --titulo "<título>" --cabecera "<título corto · partido>" --autor "<autor>"` (en sesiones, `--pie "Sesión preparada por <autor>"`).
8. **Revisa el PDF antes de entregarlo:** abre todas las páginas y comprueba que no hay textos cortados, gráficos ilegibles, flechas que tapan jugadores ni páginas casi vacías. Ajusta y repite.
9. **Entrega** los PDF e indica cuántas páginas tiene cada uno.

**Privacidad:** si el informe tiene datos de menores o de salud, no lo subas al repositorio (la carpeta `informes/` no se sube).
