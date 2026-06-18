"""
Subsetea Material Symbols Outlined conservando el render por NOMBRE (ligaduras).

El problema: Material Symbols pinta cada icono como una ligadura del texto del
nombre (p. ej. "arrow_back" -> glifo). Un subset normal por --text mantiene las
26 letras, y el "layout closure" entonces conserva TODAS las ligaduras (sus
entradas son letras) -> arrastra los ~3700 iconos (apenas baja de 3.95MB a 2.7MB).

La solución de acá: primero FILTRAR el GSUB para dejar solo las ligaduras de los
iconos que se usan; recién después subsetear. Así el closure solo puede arrastrar
esos iconos. Resultado: ~40KB conservando el render por nombre (cero cambios de
código en la app).

Uso: python scripts/subset-material-symbols.py <in.woff2> <icons.txt> <out.woff2>
"""
import sys
from fontTools.ttLib import TTFont
from fontTools.subset import Subsetter, Options


def glyph_to_char(font):
    """glyphname -> carácter (para reconstruir el nombre desde la secuencia)."""
    best = {}
    for table in font["cmap"].tables:
        for codepoint, name in table.cmap.items():
            best.setdefault(name, chr(codepoint))
    return best


def ligature_name(first, components, g2c):
    chars = [g2c.get(g) for g in [first, *components]]
    if any(c is None for c in chars):
        return None
    return "".join(chars)


def main(src, icons_file, out):
    with open(icons_file, encoding="utf-8") as fh:
        wanted = {line.strip() for line in fh if line.strip()}

    font = TTFont(src)
    g2c = glyph_to_char(font)

    # 1) Filtrar las ligaduras del GSUB a solo los iconos deseados.
    gsub = font["GSUB"].table
    kept = 0
    for lookup in gsub.LookupList.Lookup:
        for st in lookup.SubTable:
            ligs = getattr(st, "ligatures", None)
            if not ligs:
                continue
            for first, ligset in list(ligs.items()):
                filtered = []
                for lig in ligset:
                    name = ligature_name(first, lig.Component, g2c)
                    if name in wanted:
                        filtered.append(lig)
                if filtered:
                    ligs[first] = filtered
                    kept += len(filtered)
                else:
                    del ligs[first]

    print(f"ligaduras conservadas: {kept} (de {len(wanted)} iconos pedidos)")

    # 2) Subsetear por el texto de los nombres. Con el GSUB ya filtrado, el
    #    closure solo arrastra los iconos cuyas ligaduras sobrevivieron.
    opts = Options()
    opts.flavor = "woff2"
    opts.layout_features = ["liga", "clig", "calt", "dlig", "rlig"]
    opts.ignore_missing_glyphs = True
    text = " ".join(sorted(wanted))
    sub = Subsetter(options=opts)
    sub.populate(text=text)
    sub.subset(font)
    font.save(out)
    print(f"escrito: {out}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3])
