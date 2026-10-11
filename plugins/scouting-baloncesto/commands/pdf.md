---
description: Convierte un informe, scouting o sesión de entrenamiento en PDF para imprimir (A4) y/o para el móvil
argument-hint: <qué informe> [a4|movil|ambos]
---

Genera el PDF de: $ARGUMENTS (formato por defecto: `ambos`).

1. **Contenido.** Usa el informe, scouting o sesión ya hecho en esta conversación (o el fichero que se indique). No añadas datos nuevos: el PDF recoge lo que ya está analizado, con sus etiquetas `[Certeza]`, `[Probable]` y `[Suposición]` (como `<span class="tag">` y `<span class="tag suposicion">`).
2. **Escribe solo el cuerpo HTML** (sin `<html>`, `<head>` ni `<style>`) en `informes/<tipo>-<equipo-o-jugador>-<fecha>.html` dentro del directorio de trabajo. Usa los componentes de `${CLAUDE_PLUGIN_ROOT}/scripts/plantillas/base.css` y toma como modelo `${CLAUDE_PLUGIN_ROOT}/scripts/ejemplos/informe-ualbany-cornell.html`:
   - `.box.aviso` para los avisos importantes (muestra pequeña, datos antiguos, jugador equivocado), siempre al principio.
   - `.score` para el marcador; `.meta` para objetivo, duración y material de una sesión.
   - `table` con `td.n` para números y `.pos` / `.neg` para +/-.
   - `.card` (`.hd` con título y `<span>` a la derecha, `.bd` con el contenido) para ejercicios, parciales o jugadores; `.objetivo` para el criterio de éxito.
   - Tablas de más de 4 columnas o con textos largos: mételas en `.solo-a4` y repite el contenido como tarjetas en `.solo-movil`.
   - `.salto` (en los dos formatos), `.salto-a4` o `.salto-movil` para separar partes.
3. **Ejecuta:** `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/a_pdf.py" informes/<fichero>.html --formato <a4|movil|ambos> --salida informes --titulo "<título>"`
4. **Revisa el resultado antes de entregarlo:** abre las páginas del PDF y comprueba que no hay tablas cortadas sin cabecera, textos que se salen ni páginas casi vacías. Si algo falla, ajusta el HTML y repite.
5. **Entrega** los PDF e indica cuántas páginas tiene cada uno.

**Privacidad:** si el informe tiene datos de menores o de salud, no lo subas al repositorio (la carpeta `informes/` está pensada para quedarse en local).
