"""Monta a logo VoeMilo em SVG (curvas, sem depender de fonte).

Medidas do traco tiradas da arte aprovada (image_b5a3740b.jpg), em pixels
daquela imagem, convertidas para unidades da fonte e alinhadas pela juncao
entre o "e" e o "m".
"""
import json
import math
import sys

d = json.load(open(sys.argv[1]))
L = {l["letra"] + str(i): l for i, l in enumerate(d["letras"])}
caminhos = d["caminhos"]

# --- escala imagem -> fonte ---------------------------------------------
XH_IMG = 540 - 375            # altura-x na arte
K = 542 / XH_IMG              # unidades da fonte por pixel da arte
JUNCAO_IMG = 583              # x da juncao e/m na arte
juncao = (L["e2"]["xmax"] + L["m3"]["xmin"]) / 2
AJUSTE = float(sys.argv[2]) if len(sys.argv) > 2 else 0.0


def P(x, y):
    return ((x - JUNCAO_IMG) * K + juncao + AJUSTE, (y - 540) * K)


# linha central do traco (arte) e largura em cada ponto (px da arte)
centro = [P(*p) for p in [(132, 604), (250, 650), (380, 660), (490, 625), (570, 560), (625, 480), (675, 400), (735, 315), (800, 238)]]
largura = [0, 22, 36, 46, 54, 60, 64, 68, 72]
largura = [w * K for w in largura]


def catmull(pts, n=14):
    out = []
    ext = [pts[0]] + pts + [pts[-1]]
    for i in range(1, len(ext) - 2):
        p0, p1, p2, p3 = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
        for k in range(n):
            t = k / n
            t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in range(2)))
    out.append(pts[-1])
    return out


def interp(vals, n=14):
    out = []
    for i in range(len(vals) - 1):
        for k in range(n):
            out.append(vals[i] + (vals[i + 1] - vals[i]) * k / n)
    out.append(vals[-1])
    return out


c = catmull(centro)
w = interp(largura)
esq, dir_ = [], []
for i, (x, y) in enumerate(c):
    a = c[max(0, i - 1)]
    b = c[min(len(c) - 1, i + 1)]
    tx, ty = b[0] - a[0], b[1] - a[1]
    n = math.hypot(tx, ty) or 1
    nx, ny = -ty / n, tx / n
    h = w[i] / 2
    esq.append((x + nx * h, y + ny * h))
    dir_.append((x - nx * h, y - ny * h))

# ponta afinada: o primeiro ponto e o proprio inicio
fmt = lambda p: f"{p[0]:.1f} {p[1]:.1f}"
traco = "M " + " L ".join(fmt(p) for p in esq) + " L " + " L ".join(fmt(p) for p in reversed(dir_)) + " Z"

# --- o canhoto: continua o traco na direcao final ------------------------
fx, fy = c[-1]
ax, ay = c[-3]
ang = math.degrees(math.atan2(fy - ay, fx - ax))
LW = largura[-1]            # mesma largura do fim do traco
COMP = 104 * K               # comprimento do canhoto (arte)
PICOTE = 24 * K             # picote perto do inicio do canhoto
ENTALHE = 13 * K            # raio do entalhe na ponta
h = LW / 2
canhoto = (
    f"M -2 {-h:.1f} L {COMP:.1f} {-h:.1f} "
    f"L {COMP:.1f} {-ENTALHE:.1f} A {ENTALHE:.1f} {ENTALHE:.1f} 0 0 0 {COMP:.1f} {ENTALHE:.1f} "
    f"L {COMP:.1f} {h:.1f} L -2 {h:.1f} Z"
)

ymin = min(min(p[1] for p in esq + dir_), fy - COMP - 60)
ymax = max(p[1] for p in esq + dir_)
xmin = min(min(p[0] for p in esq + dir_), 0)
xmax = d["largura"]
M = 40
vb = (xmin - M, ymin - M, xmax - xmin + 2 * M, ymax - ymin + 2 * M)

letras = {l: caminhos[i] for i, l in enumerate(["v", "o", "e", "m", "i", "l", "o2"])}
antes = "".join(caminhos[i] for i in [0, 1, 2, 4, 5, 6])  # tudo menos o m
m = caminhos[3]
CORTE = 26  # folga do entrelacamento, em unidades da fonte

saida = {
    "viewBox": " ".join(f"{v:.0f}" for v in vb),
    "letras": antes,
    "m": m,
    "traco": traco,
    "canhoto": canhoto,
    "canhotoTransform": f"translate({fx:.1f} {fy:.1f}) rotate({ang:.2f})",
    "picote": f"M {PICOTE:.1f} {-h + 8:.1f} L {PICOTE:.1f} {h - 8:.1f}",
    "corte": CORTE,
}
json.dump(saida, sys.stdout)
