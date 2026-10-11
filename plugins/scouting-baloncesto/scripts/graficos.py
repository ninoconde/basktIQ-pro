"""Gráficos SVG para los informes (sin dependencias externas).

Cada función recibe datos sencillos y devuelve un <svg> que se escala al ancho
de la página. a_pdf.py los dibuja a partir de bloques del contenido así:

  <div class="grafico" data-tipo="cascada" data-datos='{"pasos": [["2P volumen", -6], ...]}'>
    <p class="leyenda">Texto bajo el gráfico</p>
  </div>

Tipos: barras, cascada, evolucion, barras_h, on_off y pizarra (diagramas de pista). Colores por defecto:
azul = equipo propio, oro = rival.
"""
from html import escape

AZUL, ORO, NAVY, ROJO, GRIS, LINEA, TINTA = "#2f5fa8", "#b8860b", "#1c2a4d", "#b8322a", "#5b6470", "#e1e4ea", "#1b1f24"
FUENTE = "Inter, 'Helvetica Neue', Arial, 'DejaVu Sans', sans-serif"


def _num(v, dec=1):
    s = f"{v:.{dec}f}".rstrip("0").rstrip(".") if isinstance(v, float) else str(v)
    return s.replace(".", ",").replace("-", "−")


def _svg(w, h, cuerpo):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
            f'font-family="{FUENTE}" font-size="11" fill="{TINTA}">{cuerpo}</svg>')


def _t(x, y, txt, anchor="middle", size=11, color=TINTA, peso=400, extra=""):
    return (f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="{anchor}" font-size="{size}" '
            f'fill="{color}" font-weight="{peso}" {extra}>{escape(str(txt))}</text>')


def _escala(vmin, vmax, y0, y1):
    rango = (vmax - vmin) or 1
    return lambda v: y1 - (v - vmin) / rango * (y1 - y0)


def barras(datos, ancho=760):
    """Barras agrupadas en paneles.
    {"paneles": [{"titulo": "Puntos", "categorias": ["Q1",...], "series": [[17,20,23,18],[30,19,15,21]]}],
     "nombres": ["Estudiantes B", "Laso"], "colores": [azul, oro], "decimales": 0}"""
    paneles = datos["paneles"]
    if ancho < 500 and len(paneles) > 1:
        # En el móvil, un panel debajo de otro para que se lean
        return "".join(barras(dict(datos, paneles=[p], nombres=datos.get("nombres") if i == len(paneles) - 1 else None), ancho)
                       for i, p in enumerate(paneles))
    colores = datos.get("colores", [AZUL, ORO])
    dec = datos.get("decimales", 0)
    W, H = ancho, 230 if ancho >= 500 else 190
    pw = W / len(paneles)
    out = []
    for i, p in enumerate(paneles):
        x0 = i * pw + 14
        ancho_p = pw - 28
        series, cats = p["series"], p["categorias"]
        vmax = max(max(s) for s in series) or 1
        y = _escala(0, vmax * 1.15, 34, H - 28)
        out.append(_t(x0, 16, p["titulo"], "start", 11.5, NAVY, 700))
        out.append(f'<line x1="{x0}" y1="{H-28}" x2="{x0+ancho_p}" y2="{H-28}" stroke="{LINEA}"/>')
        gw = ancho_p / len(cats)
        bw = gw * 0.7 / len(series)
        for c, cat in enumerate(cats):
            gx = x0 + c * gw + gw * 0.15
            for s, serie in enumerate(series):
                v = serie[c]
                bx = gx + s * bw
                out.append(f'<rect x="{bx:.1f}" y="{y(v):.1f}" width="{bw-2:.1f}" height="{(H-28)-y(v):.1f}" fill="{colores[s % len(colores)]}"/>')
                out.append(_t(bx + bw / 2 - 1, y(v) - 4, _num(round(v, dec), dec), size=9, color=GRIS))
            out.append(_t(x0 + c * gw + gw / 2, H - 12, cat, size=10, color=GRIS))
    nombres = datos.get("nombres")
    if nombres:
        lx = W - 10
        for s in reversed(range(len(nombres))):
            ancho_txt = 7 * len(nombres[s]) + 18
            lx -= ancho_txt
            out.append(f'<rect x="{lx}" y="{H-9}" width="9" height="9" fill="{colores[s % len(colores)]}"/>')
            out.append(_t(lx + 13, H - 1, nombres[s], "start", 9.5, GRIS))
    return _svg(W, H + 4, "".join(out))


def cascada(datos, ancho=760):
    """Cascada del margen: {"pasos": [["2P: volumen", -6.0], ["2P: eficiencia", -4.0], ["Triples", 0], ["Tiros libres", 3.0]],
     "total": "Margen final", "decimales": 1}"""
    pasos = datos["pasos"]
    dec = datos.get("decimales", 1)
    W, H = ancho, 260
    estrecho = ancho < 500
    acum, tramos = 0, []
    for nombre, v in pasos:
        tramos.append((nombre, acum, acum + v, v))
        acum += v
    tramos.append((datos.get("total", "Margen final"), 0, acum, acum))
    vals = [0] + [a for t in tramos for a in t[1:3]]
    vmin, vmax = min(vals), max(vals)
    pad = (vmax - vmin) * 0.15 or 1
    y = _escala(vmin - pad, vmax + pad, 16, H - 46)
    x0 = 8 if estrecho else 50
    bw = (W - x0 - 8) / len(tramos)
    out = [f'<line x1="{x0}" y1="{y(0):.1f}" x2="{W-10}" y2="{y(0):.1f}" stroke="{TINTA}" stroke-width="1"/>']
    for i, (nombre, a, b, v) in enumerate(tramos):
        es_total = i == len(tramos) - 1
        color = NAVY if es_total else (AZUL if v > 0 else (ORO if v < 0 else GRIS))
        bx = x0 + i * bw + bw * 0.18
        top, bot = y(max(a, b)), y(min(a, b))
        alto = max(bot - top, 1.5)
        out.append(f'<rect x="{bx:.1f}" y="{top:.1f}" width="{bw*0.64:.1f}" height="{alto:.1f}" fill="{color}"/>')
        txt = ("+" if v > 0 and not es_total else "") + _num(round(v, dec), dec)
        dentro = alto > 22
        ty = (top + bot) / 2 + 4 if dentro else top - 5
        out.append(_t(bx + bw * 0.32, ty, txt, size=12, color="#fff" if dentro else TINTA, peso=700))
        if i < len(tramos) - 1:
            out.append(f'<line x1="{bx+bw*0.64:.1f}" y1="{y(b):.1f}" x2="{bx+bw:.1f}" y2="{y(b):.1f}" stroke="{GRIS}" stroke-dasharray="2,2"/>')
        lineas = str(nombre).split("\n")
        if estrecho:
            lineas = lineas[0].replace(": ", ":\n").split("\n")
        for k, linea in enumerate(lineas):
            out.append(_t(bx + bw * 0.32, H - 28 + k * (11 if estrecho else 13), linea, size=8 if estrecho else 10, color=GRIS))
    return _svg(W, H, "".join(out))


def evolucion(datos, ancho=760):
    """Margen a lo largo del partido (línea escalonada).
    {"puntos": [[0,0],[0.25,-3],...]  (minuto jugado, margen propio),
     "duracion": 40, "periodos": [10,10,10,10], "anotaciones": [[minuto, margen, "texto"]],
     "propio": "Estudiantes B", "rival": "Laso", "tiempos_muertos": {"propio": [6.4], "rival": [15.4]}}"""
    pts = datos["puntos"]
    dur = datos.get("duracion", 40)
    periodos = datos.get("periodos", [10, 10, 10, 10])
    W, H = ancho, 300
    x0, x1 = (30 if ancho < 500 else 46), W - 12
    margenes = [m for _, m in pts] + [0]
    lo, hi = min(margenes), max(margenes)
    lo, hi = min(lo, -5) - 2, max(hi, 5) + 2
    y = _escala(lo, hi, 26, H - 48)
    x = lambda t: x0 + t / dur * (x1 - x0)
    out = []
    paso = 5 if hi - lo <= 40 else 10
    v = (int(lo) // paso) * paso
    while v <= hi:
        if v >= lo:
            out.append(f'<line x1="{x0}" y1="{y(v):.1f}" x2="{x1}" y2="{y(v):.1f}" stroke="{LINEA}"/>')
            out.append(_t(x0 - 6, y(v) + 4, ("+" if v > 0 else "") + _num(v), "end", 9.5, GRIS))
        v += paso
    t = 0
    for i, p in enumerate(periodos):
        out.append(_t(x(t + p / 2), 14, f"Q{i+1}" if i < 4 else f"P{i-3}", size=10, color=NAVY, peso=700))
        t += p
        if t < dur:
            out.append(f'<line x1="{x(t):.1f}" y1="22" x2="{x(t):.1f}" y2="{H-48}" stroke="{LINEA}"/>')
    for m in range(0, int(dur) + 1, 5):
        out.append(_t(x(m), H - 32, m, size=9.5, color=GRIS))
    out.append(_t((x0 + x1) / 2, H - 18, "Minuto de juego", size=9.5, color=GRIS))
    # línea escalonada y relleno
    d, prev = f"M{x(0):.1f},{y(0):.1f}", 0
    for tm, mg in pts:
        d += f" L{x(tm):.1f},{y(prev):.1f} L{x(tm):.1f},{y(mg):.1f}"
        prev = mg
    d += f" L{x(dur):.1f},{y(prev):.1f}"
    relleno = d + f" L{x(dur):.1f},{y(0):.1f} Z"
    out.append(f'<path d="{relleno}" fill="{ORO}" fill-opacity="0.16"/>')
    out.append(f'<line x1="{x0}" y1="{y(0):.1f}" x2="{x1}" y2="{y(0):.1f}" stroke="{TINTA}"/>')
    out.append(f'<path d="{d}" fill="none" stroke="{ORO}" stroke-width="2"/>')
    out.append(_t(x1 - 4, y(hi) + 12, f"{datos.get('propio', 'Propio')} por delante", "end", 9, AZUL, 700))
    out.append(_t(x0 + 4, y(lo) - 4, f"{datos.get('rival', 'Rival')} por delante", "start", 9, ORO, 700))
    for tm, mg, txt in datos.get("anotaciones", []):
        ax, ay = x(tm), y(mg)
        ty = ay + 22 if mg < 0 else ay - 14
        if ty > H - 62:  # no pisar el eje ni los tiempos muertos
            ty = ay - 12
        out.append(f'<circle cx="{ax:.1f}" cy="{ay:.1f}" r="3" fill="{NAVY}"/>')
        out.append(f'<line x1="{ax:.1f}" y1="{ay:.1f}" x2="{ax:.1f}" y2="{ty-4 if ty < ay else ty-11:.1f}" stroke="{GRIS}" stroke-width=".6"/>')
        margen_txt = 70 if ancho < 500 else 120
        anchor = "start" if ax < x0 + margen_txt else ("end" if ax > x1 - margen_txt else "middle")
        out.append(_t(ax, ty, txt, anchor, 9, TINTA, 600, 'paint-order="stroke" stroke="#fff" stroke-width="3"'))
    tms = datos.get("tiempos_muertos", {})
    for clave, color in (("propio", AZUL), ("rival", ORO)):
        for tm in tms.get(clave, []):
            px = x(tm)
            out.append(f'<path d="M{px-4:.1f},{H-56} L{px+4:.1f},{H-56} L{px:.1f},{H-50} Z" fill="{color}"/>')
    return _svg(W, H, "".join(out))


def barras_h(datos, ancho=760):
    """Barras horizontales con signo (+/-): {"items": [["Cooper · Drake · ...", 5, "2:45 · 5-0"], ...], "decimales": 0}"""
    items = datos["items"]
    W = ancho
    estrecho = ancho < 500
    fila = 40 if estrecho else 28
    H = 10 + fila * len(items)
    pos = max([v for _, v, *_ in items if v > 0] + [1])
    neg = max([-v for _, v, *_ in items if v < 0] + [1])
    izq = 6 if estrecho else 330          # comienzo de la zona de barras
    der = W - 40
    esc = (der - izq) / (pos + neg)
    xc = izq + neg * esc
    out = [f'<line x1="{xc:.1f}" y1="4" x2="{xc:.1f}" y2="{H-4}" stroke="{TINTA}"/>']
    for i, it in enumerate(items):
        nombre, v = it[0], it[1]
        extra = it[2] if len(it) > 2 else ""
        top = 6 + i * fila
        by = top + (18 if estrecho else 5)
        largo = abs(v) * esc
        color = AZUL if v > 0 else (ROJO if v < 0 else GRIS)
        bx = xc if v >= 0 else xc - largo
        out.append(f'<rect x="{bx:.1f}" y="{by:.1f}" width="{max(largo,1.5):.1f}" height="15" fill="{color}"/>')
        valor = ("+" if v > 0 else "") + _num(v, datos.get("decimales", 0))
        if v < 0 and (largo > 34 or xc - largo - 6 < 24):   # dentro de la barra: no pisa las etiquetas
            out.append(_t(xc - largo + 6, by + 12, valor, "start", 10.5, "#fff", 700))
        else:
            out.append(_t(xc + largo + 6 if v >= 0 else xc - largo - 6, by + 12, valor, "start" if v >= 0 else "end", 10.5, color, 700))
        if estrecho:
            texto = nombre + (f" · {extra}" if extra else "")
            out.append(_t(izq, top + 12, texto, "start", 10, TINTA))
        else:
            out.append(_t(izq - 10, by + (6 if extra else 11), nombre, "end", 9.5, TINTA))
            if extra:
                out.append(_t(izq - 10, by + 17, extra, "end", 8.5, GRIS))
    return _svg(W, H, "".join(out))


def on_off(datos, ancho=760):
    """Margen con cada jugador en pista y en el banquillo:
    {"items": [["Moncayo (30 min)", 10, -17], ...], "referencia": -7}"""
    items = datos["items"]
    W = ancho
    fila = 24
    H = 40 + fila * len(items)
    vals = [v for _, a, b in items for v in (a, b)] + [0, datos.get("referencia", 0)]
    lo, hi = min(vals) - 3, max(vals) + 3
    x0, x1 = (118 if ancho < 500 else 170), W - 20
    x = lambda v: x0 + (v - lo) / (hi - lo) * (x1 - x0)
    out = [f'<line x1="{x(0):.1f}" y1="8" x2="{x(0):.1f}" y2="{H-30}" stroke="{TINTA}"/>']
    if "referencia" in datos:
        r = datos["referencia"]
        out.append(f'<line x1="{x(r):.1f}" y1="8" x2="{x(r):.1f}" y2="{H-30}" stroke="{ORO}" stroke-dasharray="4,3"/>')
        out.append(_t(x(r), H - 18, f"Margen final {'+' if r > 0 else ''}{_num(r)}", size=9, color=ORO, peso=700))
    for i, (nombre, en_pista, fuera) in enumerate(items):
        cy = 16 + i * fila
        out.append(f'<line x1="{x(min(en_pista,fuera)):.1f}" y1="{cy}" x2="{x(max(en_pista,fuera)):.1f}" y2="{cy}" stroke="{LINEA}" stroke-width="5"/>')
        out.append(f'<circle cx="{x(fuera):.1f}" cy="{cy}" r="5" fill="#fff" stroke="{AZUL}" stroke-width="2"/>')
        out.append(f'<circle cx="{x(en_pista):.1f}" cy="{cy}" r="5" fill="{AZUL}"/>')
        out.append(_t(x0 - 10, cy + 4, nombre, "end", 9.5))
        out.append(_t(x(en_pista) + (10 if en_pista >= fuera else -10), cy + 4, ("+" if en_pista > 0 else "") + _num(en_pista), "start" if en_pista >= fuera else "end", 9, AZUL, 700))
    out.append(f'<circle cx="{x0}" cy="{H-6}" r="4" fill="{AZUL}"/>')
    out.append(_t(x0 + 8, H - 2, "En pista" if ancho < 500 else "Con el jugador en pista", "start", 9, GRIS))
    sep = 130 if ancho < 500 else 170
    out.append(f'<circle cx="{x0+sep}" cy="{H-6}" r="4" fill="#fff" stroke="{AZUL}" stroke-width="2"/>')
    out.append(_t(x0 + sep + 8, H - 2, "En el banquillo" if ancho < 500 else "Con el jugador en el banquillo", "start", 9, GRIS))
    return _svg(W, H, "".join(out))


# ---------------------------------------------------------------- Pizarra
# Media pista FIBA en metros: x de -7,5 (izquierda) a 7,5 (derecha); y desde la línea
# de fondo (0) hasta medio campo (14). La canasta queda arriba, como en una pizarra.
PIZ_ESC = 22          # unidades SVG por metro
PIZ_MARGEN = 10
MADERA, MADERA_2, ZONA, LINEA_PISTA = "#e9c896", "#dfba82", "#1f7fd1", "#ffffff"


def _pp(x, y):
    return PIZ_MARGEN + (x + 7.5) * PIZ_ESC, PIZ_MARGEN + y * PIZ_ESC


def _punto(ref, jugadores):
    if isinstance(ref, str):
        if ref not in jugadores:
            raise ValueError(f"La pizarra usa '{ref}', que no está en jugadores ni defensores.")
        return jugadores[ref]
    return tuple(ref)


def _pista(alto_m):
    W = 15 * PIZ_ESC + 2 * PIZ_MARGEN
    H = alto_m * PIZ_ESC + 2 * PIZ_MARGEN
    o = [f'<rect x="0" y="0" width="{W}" height="{H}" fill="#8fc3ea"/>']
    x0, y0 = _pp(-7.5, 0)
    x1, y1 = _pp(7.5, alto_m)
    o.append(f'<rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}" fill="{MADERA}"/>')
    for i in range(1, 30):                       # tablas del parquet
        xx = x0 + i * (x1 - x0) / 30
        o.append(f'<line x1="{xx:.1f}" y1="{y0}" x2="{xx:.1f}" y2="{y1}" stroke="{MADERA_2}" stroke-width=".8"/>')
    L = f'stroke="{LINEA_PISTA}" stroke-width="2" fill="none"'
    kx0, ky0 = _pp(-2.45, 0)
    kx1, ky1 = _pp(2.45, 5.8)
    o.append(f'<rect x="{kx0}" y="{ky0}" width="{kx1-kx0}" height="{ky1-ky0}" fill="{ZONA}" {L.replace("fill=\"none\"", "")}/>')
    cx, cy = _pp(0, 5.8)
    r = 1.8 * PIZ_ESC
    o.append(f'<path d="M{cx-r},{cy} A{r},{r} 0 0 0 {cx+r},{cy}" {L}/>')                       # fuera de la zona: continua
    o.append(f'<path d="M{cx-r},{cy} A{r},{r} 0 0 1 {cx+r},{cy}" {L} stroke-dasharray="6,5"/>')  # dentro: discontinua
    bx, by = _pp(0, 1.575)
    r3 = 6.75 * PIZ_ESC
    yc = 1.575 + (6.75 ** 2 - 6.6 ** 2) ** 0.5   # unión de la recta de 0,9 m y el arco
    ax0, ay0 = _pp(-6.6, 0)
    ax1, ay1 = _pp(-6.6, yc)
    bx1, by1 = _pp(6.6, yc)
    o.append(f'<path d="M{ax0},{ay0} L{ax1},{ay1} A{r3},{r3} 0 0 0 {bx1},{by1} L{_pp(6.6,0)[0]},{_pp(6.6,0)[1]}" {L}/>')
    rr = 1.25 * PIZ_ESC
    o.append(f'<path d="M{bx-rr},{by} A{rr},{rr} 0 0 0 {bx+rr},{by}" {L}/>')
    tx0, ty = _pp(-0.9, 1.2)
    tx1, _ = _pp(0.9, 1.2)
    o.append(f'<line x1="{tx0}" y1="{ty}" x2="{tx1}" y2="{ty}" stroke="{LINEA_PISTA}" stroke-width="3"/>')
    o.append(f'<circle cx="{bx}" cy="{by}" r="{0.23*PIZ_ESC}" {L}/>')
    o.append(f'<rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}" {L}/>')
    if alto_m >= 14:
        mx, my = _pp(0, 14)
        o.append(f'<path d="M{mx-r},{my} A{r},{r} 0 0 1 {mx+r},{my}" {L}/>')
    return W, H, o


def _flecha(p, q, curva, tipo, num=None):
    """Trayectoria de p a q (en metros). curva > 0 dobla a la izquierda del sentido de la marcha."""
    (x1, y1), (x2, y2) = _pp(*p), _pp(*q)
    dx, dy = x2 - x1, y2 - y1
    largo = (dx * dx + dy * dy) ** 0.5 or 1
    nx, ny = -dy / largo, dx / largo
    mx, my = (x1 + x2) / 2 + nx * curva * largo, (y1 + y2) / 2 + ny * curva * largo
    # acortar el final para no tapar al jugador de destino
    def bez(t):
        a = (1 - t) ** 2
        return a * x1 + 2 * (1 - t) * t * mx + t * t * x2, a * y1 + 2 * (1 - t) * t * my + t * t * y2
    fin = 1 - min(0.3, 13 / largo)
    ini = min(0.3, 11 / largo)
    pts = [bez(ini + (fin - ini) * k / 40) for k in range(41)]
    if tipo == "bote":                           # línea en zigzag, un pico cada ~7 unidades
        zz, acum, sig = [pts[0]], 0.0, 1
        for k in range(1, len(pts) - 3):
            (ax_, ay_), (bx_, by_) = pts[k - 1], pts[k]
            seg = ((bx_ - ax_) ** 2 + (by_ - ay_) ** 2) ** 0.5 or 1
            acum += seg
            if acum >= 7:
                acum = 0
                zz.append((bx_ - (by_ - ay_) / seg * 4 * sig, by_ + (bx_ - ax_) / seg * 4 * sig))
                sig = -sig
        pts = zz + pts[-3:]
    d = "M" + " L".join(f"{px:.1f},{py:.1f}" for px, py in pts)
    estilo = 'stroke="#111" stroke-width="2" fill="none"'
    if tipo == "pase":
        estilo += ' stroke-dasharray="6,4"'
    o = [f'<path d="{d}" {estilo}/>']
    (ax, ay), (bx, by) = pts[-2], pts[-1]
    l = ((bx - ax) ** 2 + (by - ay) ** 2) ** 0.5 or 1
    ux, uy = (bx - ax) / l, (by - ay) / l
    if tipo == "bloqueo":                         # final en T
        o.append(f'<line x1="{bx-uy*9:.1f}" y1="{by+ux*9:.1f}" x2="{bx+uy*9:.1f}" y2="{by-ux*9:.1f}" stroke="#111" stroke-width="3"/>')
    else:
        o.append(f'<path d="M{bx+ux*2:.1f},{by+uy*2:.1f} L{bx-ux*9-uy*5:.1f},{by-uy*9+ux*5:.1f} L{bx-ux*9+uy*5:.1f},{by-uy*9-ux*5:.1f} Z" fill="#111"/>')
    if num is not None:
        px, py = bez(0.5)
        o.append(f'<circle cx="{px:.1f}" cy="{py:.1f}" r="8" fill="#fff" stroke="#111" stroke-width="1"/>')
        o.append(_t(px, py + 4, num, size=10, color="#111", peso=700))
    return "".join(o)


def pizarra(datos, ancho=760):
    """Diagrama de un ejercicio en media pista.
    {"jugadores": [["1", 0, 8], ["2", -5.5, 3]],      # atacantes: id, x, y (metros)
     "defensores": [["X1", 1.5, 2.5]],
     "balon": "1",                                    # id del jugador con balón (o [x, y])
     "conos": [[3, 6]],
     "acciones": [                                    # en el orden en que ocurren
       {"tipo": "movimiento", "de": "2", "a": [-1, 1.5], "curva": 0.25, "num": 1},
       {"tipo": "pase", "de": "1", "a": "2"},
       {"tipo": "bote", "de": "1", "a": [3, 4]},
       {"tipo": "bloqueo", "de": "3", "a": [1, 5]},
       {"tipo": "tiro", "de": "1"}],
     "alto": 9.5,                                     # metros de pista a mostrar (por defecto 9,5; 14 = medio campo)
     "x": [-3.5, 3.5],                                # opcional: recorta a lo ancho (zoom para ejercicios bajo el aro)
     "leyenda": true}
    Tipos de acción: movimiento (línea continua), pase (discontinua), bote (zigzag),
    bloqueo (final en T), tiro (discontinua hacia la canasta)."""
    alto = datos.get("alto", 9.5)
    W, H, o = _pista(alto)
    pos = {j[0]: (j[1], j[2]) for j in datos.get("jugadores", []) + datos.get("defensores", [])}
    for c in datos.get("conos", []):
        cx, cy = _pp(*c)
        o.append(f'<path d="M{cx},{cy-8} L{cx+6},{cy+5} L{cx-6},{cy+5} Z" fill="#f28c28" stroke="#fff"/>')
    for a in datos.get("acciones", []):
        tipo = a.get("tipo", "movimiento")
        if tipo not in ("movimiento", "pase", "bote", "bloqueo", "tiro"):
            raise ValueError(f"Acción de pizarra desconocida: {tipo!r}")
        p = _punto(a["de"], pos)
        q = (0, 1.575) if tipo == "tiro" else _punto(a["a"], pos)
        o.append(_flecha(p, q, a.get("curva", 0), "pase" if tipo == "tiro" else tipo, a.get("num")))
    for jid, x, y in datos.get("defensores", []):
        px, py = _pp(x, y)
        o.append(_t(px, py + 6, "X", size=19, color="#b8322a", peso=700, extra='stroke="#fff" stroke-width="0.6"'))
        o.append(_t(px + 9, py + 10, jid.lstrip("Xx"), size=9, color="#b8322a", peso=700))
    for jid, x, y in datos.get("jugadores", []):
        px, py = _pp(x, y)
        o.append(f'<circle cx="{px}" cy="{py}" r="11" fill="#fff" stroke="{NAVY}" stroke-width="2.2"/>')
        o.append(_t(px, py + 4.5, jid, size=12, color=NAVY, peso=700))
    balon = datos.get("balon")
    if balon is not None:
        bx, by = _pp(*_punto(balon, pos))
        if isinstance(balon, str):
            bx, by = bx + 1, by - 18
        o.append(f'<circle cx="{bx:.1f}" cy="{by:.1f}" r="6.5" fill="#e0701b" stroke="#7a3300" stroke-width="1"/>')
        o.append(f'<path d="M{bx-6.5:.1f},{by:.1f} H{bx+6.5:.1f} M{bx:.1f},{by-6.5:.1f} V{by+6.5:.1f}" stroke="#7a3300" stroke-width=".8"/>')
    if datos.get("leyenda"):
        H, extra = _leyenda_flechas(W, H)
        o += extra
    if datos.get("x"):
        xa = _pp(datos["x"][0], 0)[0] - PIZ_MARGEN
        xb = _pp(datos["x"][1], 0)[0] + PIZ_MARGEN
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{xa:.1f} 0 {xb-xa:.1f} {H}" '
                f'font-family="{FUENTE}" font-size="11" fill="{TINTA}">{"".join(o)}</svg>')
    return _svg(W, H, "".join(o))


def _leyenda_flechas(W, y_base):
    o = []
    items = [("movimiento", "Movimiento"), ("pase", "Pase o tiro"), ("bote", "Bote"), ("bloqueo", "Bloqueo")]
    for k, (tp, txt) in enumerate(items):
        lx = 14 + (k % 2) * (W / 2)
        ly = y_base + 10 + (k // 2) * 24
        m0 = ((lx - PIZ_MARGEN) / PIZ_ESC - 7.5, (ly - PIZ_MARGEN) / PIZ_ESC)
        o.append(_flecha(m0, (m0[0] + 2.4, m0[1]), 0, tp))
        o.append(_t(lx + 2.4 * PIZ_ESC + 8, ly + 4, txt, "start", 11, TINTA))
    return y_base + 56, o


def leyenda_pizarra(datos=None, ancho=760):
    """Leyenda de símbolos de las pizarras (sin pista)."""
    W = 15 * PIZ_ESC + 2 * PIZ_MARGEN
    o = []
    simbolos = [("jugador", "Atacante"), ("defensor", "Defensor"), ("balon", "Balón"), ("cono", "Cono")]
    for k, (tp, txt) in enumerate(simbolos):
        cx, cy = 26 + k * (W / 4), 18
        if tp == "jugador":
            o.append(f'<circle cx="{cx}" cy="{cy}" r="10" fill="#fff" stroke="{NAVY}" stroke-width="2"/>' + _t(cx, cy + 4, "1", size=11, color=NAVY, peso=700))
        elif tp == "defensor":
            o.append(_t(cx, cy + 6, "X", size=18, color="#b8322a", peso=700))
        elif tp == "balon":
            o.append(f'<circle cx="{cx}" cy="{cy}" r="6.5" fill="#e0701b" stroke="#7a3300"/>')
        else:
            o.append(f'<path d="M{cx},{cy-8} L{cx+6},{cy+5} L{cx-6},{cy+5} Z" fill="#f28c28"/>')
        o.append(_t(cx + 15, cy + 4, txt, "start", 11, TINTA))
    H, extra = _leyenda_flechas(W, 34)
    return _svg(W, H, "".join(o + extra))


TIPOS = {"barras": barras, "cascada": cascada, "evolucion": evolucion, "barras_h": barras_h, "on_off": on_off,
         "pizarra": pizarra, "leyenda_pizarra": leyenda_pizarra}


def pista_portada():
    """Líneas de pista decorativas para la portada."""
    return ('<svg class="pista" viewBox="0 0 210 297" preserveAspectRatio="xMidYMid slice" fill="none" '
            'stroke="#c39a2a" stroke-opacity=".35" stroke-width=".35">'
            '<circle cx="85" cy="-2" r="26"/>'
            '<circle cx="170" cy="38" r="18"/><path d="M170 20 V56 M152 38 H188 M157 25 Q166 38 157 51 M183 25 Q174 38 183 51"/>'
            '<path d="M30 297 V175 A75 75 0 0 1 180 175 V297"/>'
            '<rect x="77" y="232" width="56" height="65"/><circle cx="105" cy="232" r="18"/>'
            '<path d="M95 297 A10 10 0 0 1 115 297"/></svg>')
