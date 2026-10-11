#!/usr/bin/env python3
"""+/- por quintetos e individual a partir de un play-by-play transcrito a JSON.

Uso: python3 quintetos.py partido.json [--json]

Formato de entrada (ver ejemplos/ualbany-cornell-2024-11-23.json):
{
  "equipo": "UAlbany", "rival": "Cornell",
  "duracion_periodos": [600, 600, 600, 600],      # segundos; añade 300 por prórroga
  "titulares": ["Cooper", "Donovan", ...],         # 5 jugadoras del equipo analizado
  "final": {"equipo": 54, "rival": 47},
  "minutos_box": {"Cooper": 35, ...},              # opcional, para validar
  "eventos": [                                     # en el MISMO orden que el PBP
    {"p": 1, "t": "09:45", "tipo": "canasta", "lado": "rival", "pts": 3},
    {"p": 1, "t": "07:30", "tipo": "sale", "jugadora": "Hill"},
    {"p": 1, "t": "07:30", "tipo": "entra", "jugadora": "Borrellas"},
    ...
  ]
}
Solo hacen falta cambios del equipo analizado y canastas/tiros libres anotados
de ambos equipos. Los puntos se asignan al quinteto en pista en ese momento,
así que el orden de cambios y tiros libres en el mismo segundo importa.
"""
import json
import sys


class ErrorDatos(Exception):
    pass


def segundos(reloj):
    m, s = reloj.split(":")
    return int(m) * 60 + int(s)


def calcular(d):
    periodos = d["duracion_periodos"]
    pista = set(d["titulares"])
    if len(pista) != 5:
        raise ErrorDatos(f"Hay {len(pista)} titulares distintas, deben ser 5.")

    quintetos, individual = {}, {}
    periodo, reloj = 1, periodos[0]
    a_favor = en_contra = 0

    def acumular(hasta):
        nonlocal reloj
        dur = reloj - hasta
        if dur < 0:
            raise ErrorDatos(f"El reloj retrocede en el periodo {periodo} ({reloj}s -> {hasta}s). Revisa el orden de eventos.")
        clave = tuple(sorted(pista))
        q = quintetos.setdefault(clave, {"seg": 0, "favor": 0, "contra": 0})
        q["seg"] += dur
        for j in pista:
            individual.setdefault(j, {"seg": 0, "pm": 0})["seg"] += dur
        reloj = hasta

    for i, ev in enumerate(d["eventos"], 1):
        p = ev["p"]
        if p < periodo:
            raise ErrorDatos(f"Evento {i}: periodo {p} después del periodo {periodo}.")
        while periodo < p:
            acumular(0)
            periodo += 1
            reloj = periodos[periodo - 1]
        acumular(segundos(ev["t"]))

        tipo = ev["tipo"]
        if tipo == "sale":
            if ev["jugadora"] not in pista:
                raise ErrorDatos(f"Evento {i} ({p}º {ev['t']}): sale {ev['jugadora']}, que no estaba en pista {sorted(pista)}.")
            pista.discard(ev["jugadora"])
        elif tipo == "entra":
            if ev["jugadora"] in pista:
                raise ErrorDatos(f"Evento {i} ({p}º {ev['t']}): entra {ev['jugadora']}, que ya estaba en pista.")
            pista.add(ev["jugadora"])
        elif tipo == "canasta":
            if len(pista) != 5:
                raise ErrorDatos(f"Evento {i} ({p}º {ev['t']}): hay {len(pista)} jugadoras en pista al anotarse una canasta.")
            pts = ev["pts"]
            signo = 1 if ev["lado"] == "equipo" else -1
            clave = tuple(sorted(pista))
            quintetos[clave]["favor" if signo > 0 else "contra"] += pts
            for j in pista:
                individual[j]["pm"] += signo * pts
            if signo > 0:
                a_favor += pts
            else:
                en_contra += pts
        else:
            raise ErrorDatos(f"Evento {i}: tipo desconocido '{tipo}'.")

    acumular(0)
    while periodo < len(periodos):
        periodo += 1
        reloj = periodos[periodo - 1]
        acumular(0)
    if len(pista) != 5:
        raise ErrorDatos(f"Al final hay {len(pista)} jugadoras en pista.")

    # Validaciones
    avisos = []
    total_seg = sum(periodos) * 5
    suma_seg = sum(v["seg"] for v in individual.values())
    if suma_seg != total_seg:
        raise ErrorDatos(f"Los minutos no cuadran: {suma_seg/60:.1f} frente a {total_seg/60:.0f}.")
    fin = d.get("final", {})
    if fin and (a_favor, en_contra) != (fin["equipo"], fin["rival"]):
        raise ErrorDatos(f"Los puntos no cuadran: {a_favor}-{en_contra} frente al final {fin['equipo']}-{fin['rival']}. Falta o sobra alguna canasta.")
    for j, mins in d.get("minutos_box", {}).items():
        calc = individual.get(j, {"seg": 0})["seg"] / 60
        if abs(calc - mins) > 1.0:
            avisos.append(f"{j}: {calc:.1f} min calculados frente a {mins} del box score (revisa sus cambios).")

    return {
        "equipo": d.get("equipo"), "rival": d.get("rival"),
        "marcador": [a_favor, en_contra],
        "quintetos": sorted(
            ({"jugadoras": list(k), "seg": v["seg"], "favor": v["favor"], "contra": v["contra"],
              "pm": v["favor"] - v["contra"]} for k, v in quintetos.items() if v["seg"] > 0),
            key=lambda q: -q["seg"]),
        "individual": sorted(
            ({"jugadora": j, "seg": v["seg"], "pm": v["pm"]} for j, v in individual.items()),
            key=lambda x: -x["pm"]),
        "avisos": avisos,
    }


def mmss(seg):
    return f"{seg // 60}:{seg % 60:02d}"


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    with open(sys.argv[1], encoding="utf-8") as f:
        datos = json.load(f)
    try:
        r = calcular(datos)
    except ErrorDatos as e:
        print(f"ERROR DE DATOS: {e}")
        sys.exit(1)
    if "--json" in sys.argv:
        print(json.dumps(r, ensure_ascii=False, indent=2))
        return
    print(f"{r['equipo']} {r['marcador'][0]} - {r['marcador'][1]} {r['rival']}  (minutos y puntos validados)\n")
    print("QUINTETOS (min | a favor-en contra | +/-)")
    for q in r["quintetos"]:
        print(f"  {mmss(q['seg']):>5} | {q['favor']:2d}-{q['contra']:2d} | {q['pm']:+d} | {', '.join(q['jugadoras'])}")
    print("\nINDIVIDUAL (min en pista | +/-)")
    for x in r["individual"]:
        print(f"  {x['jugadora']:<14} {x['seg']/60:5.1f} | {x['pm']:+d}")
    if r["avisos"]:
        print("\nAVISOS")
        for a in r["avisos"]:
            print(f"  - {a}")


if __name__ == "__main__":
    main()
