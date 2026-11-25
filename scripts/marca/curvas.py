"""Gera as curvas de "voemilo" na Bricolage Grotesque (peso e tamanho otico
fixos) e as posicoes de cada letra, em JSON, para montar a logo em SVG."""
import json
import sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

fonte = TTFont(sys.argv[1])
eixos = {a.axisTag: (a.minValue, a.maxValue) for a in fonte["fvar"].axes}
print("eixos:", eixos, file=sys.stderr)
alvo = {"wght": float(sys.argv[3]) if len(sys.argv) > 3 else 800.0}
if "opsz" in eixos:
    alvo["opsz"] = eixos["opsz"][1]
if "wdth" in eixos:
    alvo["wdth"] = 100.0
fonte = instantiateVariableFont(fonte, alvo)

palavra = "voemilo"
cmap = fonte.getBestCmap()
glifos = fonte.getGlyphSet()
hmtx = fonte["hmtx"]
upm = fonte["head"].unitsPerEm
rastreio = float(sys.argv[2]) if len(sys.argv) > 2 else -0.02  # em em

x = 0.0
letras = []
caminhos = []
for ch in palavra:
    nome = cmap[ord(ch)]
    avanco = hmtx[nome][0]
    pen = SVGPathPen(glifos)
    # y da fonte cresce para cima; no SVG, para baixo
    glifos[nome].draw(TransformPen(pen, (1, 0, 0, -1, x, 0)))
    bp = BoundsPen(glifos)
    glifos[nome].draw(bp)
    xmin, ymin, xmax, ymax = bp.bounds or (0, 0, 0, 0)
    letras.append({"letra": ch, "x": x, "avanco": avanco, "xmin": x + xmin, "xmax": x + xmax, "topo": -ymax, "base": -ymin})
    caminhos.append(pen.getCommands())
    x += avanco + rastreio * upm

json.dump({"upm": upm, "largura": x - rastreio * upm, "letras": letras, "caminhos": caminhos}, sys.stdout)
