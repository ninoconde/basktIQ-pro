#!/usr/bin/env python3
"""Convierte un informe (fragmento HTML) en PDF para imprimir (A4) y/o para el móvil.

Uso:
  python3 a_pdf.py contenido.html [--formato a4|movil|ambos] [--salida carpeta] [--titulo "Texto"]

`contenido.html` es solo el cuerpo del informe (sin <html>, <head> ni <style>):
usa los componentes de plantillas/base.css (ver ejemplos/informe-ualbany-cornell.html).
El script añade el estilo de cada formato, imprime con Chrome/Chromium sin
ventana y comprueba que el PDF existe y cuántas páginas tiene.

Si no encuentra el navegador, indica la ruta con la variable BASKTIQ_CHROME.
"""
import argparse
import glob
import html
import os
import shutil
import subprocess
import sys
import tempfile

AQUI = os.path.dirname(os.path.abspath(__file__))
PLANTILLAS = os.path.join(AQUI, "plantillas")

CANDIDATOS = [
    "google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome", "msedge",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
]


def buscar_navegador():
    propio = os.environ.get("BASKTIQ_CHROME")
    if propio:
        return propio if os.path.exists(propio) else None
    for c in CANDIDATOS:
        ruta = shutil.which(c) or (c if os.path.isabs(c) and os.path.exists(c) else None)
        if ruta:
            return ruta
    # Navegadores instalados por Playwright (p. ej. /opt/pw-browsers o ~/.cache/ms-playwright)
    bases = [os.environ.get("PLAYWRIGHT_BROWSERS_PATH", ""), os.path.expanduser("~/.cache/ms-playwright")]
    for base in filter(None, bases):
        for ruta in sorted(glob.glob(os.path.join(base, "chromium-*", "chrome-*", "chrome")), reverse=True):
            if os.access(ruta, os.X_OK):
                return ruta
    return None


def leer(ruta):
    with open(ruta, encoding="utf-8") as f:
        return f.read()


def documento(cuerpo, formato, titulo):
    css = leer(os.path.join(PLANTILLAS, "base.css")) + "\n" + leer(os.path.join(PLANTILLAS, f"{formato}.css"))
    return (f'<!doctype html><html lang="es"><head><meta charset="utf-8">'
            f"<title>{html.escape(titulo)}</title><style>{css}</style></head>"
            f"<body>{cuerpo}</body></html>")


def paginas(pdf):
    try:
        from pypdf import PdfReader
    except ImportError:
        return None
    return len(PdfReader(pdf).pages)


def imprimir(navegador, html_path, pdf_path):
    with tempfile.TemporaryDirectory() as perfil:
        cmd = [navegador, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
               f"--user-data-dir={perfil}", f"--print-to-pdf={pdf_path}", html_path]
        if hasattr(os, "geteuid") and os.geteuid() == 0:
            cmd.insert(1, "--no-sandbox")  # Chrome no arranca como root sin esto (contenedores)
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if not os.path.exists(pdf_path) or os.path.getsize(pdf_path) == 0:
        raise RuntimeError(f"Chrome no generó el PDF.\n{r.stderr[-800:]}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("contenido")
    ap.add_argument("--formato", choices=["a4", "movil", "ambos"], default="ambos")
    ap.add_argument("--salida", default=".")
    ap.add_argument("--titulo")
    a = ap.parse_args()

    cuerpo = leer(a.contenido)
    if "<html" in cuerpo.lower() or "<style" in cuerpo.lower():
        print("ERROR: el contenido debe ser solo el cuerpo del informe, sin <html> ni <style>.")
        sys.exit(1)
    navegador = buscar_navegador()
    if not navegador:
        print("ERROR: no encuentro Chrome, Chromium ni Edge. Instala uno o indica su ruta en BASKTIQ_CHROME.")
        sys.exit(1)

    base = os.path.splitext(os.path.basename(a.contenido))[0]
    titulo = a.titulo or base
    os.makedirs(a.salida, exist_ok=True)
    formatos = ["a4", "movil"] if a.formato == "ambos" else [a.formato]
    for fmt in formatos:
        nombre = base if fmt == "a4" else f"{base}-movil"
        pdf = os.path.abspath(os.path.join(a.salida, f"{nombre}.pdf"))
        with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as tmp:
            tmp.write(documento(cuerpo, fmt, titulo))
        try:
            imprimir(navegador, tmp.name, pdf)
        finally:
            os.remove(tmp.name)
        n = paginas(pdf)
        print(f"{fmt:5s} -> {pdf}  ({n if n is not None else '?'} páginas)")


if __name__ == "__main__":
    main()
