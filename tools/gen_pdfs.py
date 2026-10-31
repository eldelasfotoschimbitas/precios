"""Genera un PDF por paquete con el estilo de la página (hoja de contactos).

Lee los datos directamente del index.html (array CATS) servido en local:
    python -m http.server 8141 --directory precios-repo
    python tools/gen_pdfs.py [http://localhost:8141] [slug1,slug2]   (con slugs solo rehace esos)
Salida: pdf/<slug>.pdf
"""
import html, sys, pathlib
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8141"
SOLO = set(sys.argv[2].split(",")) if len(sys.argv) > 2 else None
OUT = pathlib.Path(__file__).resolve().parent.parent / "pdf"
OUT.mkdir(exist_ok=True)

CONDICIONES = {
    "default": ["Reservas con el 40% de adelanto (va al total); el resto se paga el día del evento.",
                "Entrega en 1 a 2 semanas por link en la nube, disponible 7 días.",
                "Fuera de mi ciudad se suma transporte y, si toca, viáticos."],
    "sesiones": ["Sesión de 1 a 3 horas. Cada hora adicional: $30.000.",
                 "Reservas con el 40% de adelanto (va al total).",
                 "Entrega en 1 a 2 semanas por Google Drive, disponible 7 días."],
    "grados": ["Precio por persona, para grupos de más de 20.",
               "Las impresiones se mandan a hacer con el 50% y se entregan al pagar el resto.",
               "Entrega digital en 1 a 2 semanas."],
    "deportivo": ["Los corredores compran sus fotos en línea con reconocimiento de rostro.",
                  "Reservas con el 40% de adelanto (va al total).",
                  "Fuera de mi ciudad se suma transporte."],
}

CSS = """
@page{size:A4;margin:0}
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{width:210mm;height:297mm;background:#22231f;color:#e9e8e1;font-family:'Archivo',sans-serif;display:flex;flex-direction:column;overflow:hidden}
.top{background:radial-gradient(130% 120% at 30% 30%,#fff 0%,#f4f3ee 55%,#e4e2da 100%);color:#22231f;padding:12mm 16mm 0;position:relative}
.top h1{font-family:'Bodoni Moda',serif;font-weight:700;font-size:40pt;line-height:.9;letter-spacing:-.02em}
.top .firma{font-family:'Caveat Brush',cursive;color:#8f5a0c;font-size:17pt;margin-top:2mm}
.top .sec{position:absolute;right:16mm;top:17mm;text-align:right;font-weight:600;font-size:10pt;color:#3b3c36;max-width:60mm}
.tira{margin:7mm -6mm 0;background:#161613;height:15mm;transform:rotate(-1.5deg);position:relative}
.tira::before,.tira::after{content:"";position:absolute;left:0;right:0;height:2.6mm;background:repeating-linear-gradient(90deg,transparent 0 2.2mm,#f4f3ee 2.2mm 4.8mm,transparent 4.8mm 7.4mm)}
.tira::before{top:1.6mm}.tira::after{bottom:1.6mm}
.tira span{position:absolute;left:14mm;top:5.6mm;font-stretch:75%;font-weight:600;font-size:7pt;letter-spacing:.14em;color:#f0a22e;white-space:nowrap}
.cuerpo{padding:10mm 16mm 0;display:grid;grid-template-columns:76mm 1fr;gap:11mm;align-items:start}
.copia{background:#fbfaf6;padding:3.2mm 3.2mm 11mm;box-shadow:0 3mm 8mm rgba(0,0,0,.45);transform:rotate(-1.6deg);position:relative}
.copia img{width:100%;aspect-ratio:4/5;object-fit:cover;display:block}
.copia.ancha img{aspect-ratio:16/11}
.copia .pie{position:absolute;left:0;right:0;bottom:2.4mm;text-align:center;font-family:'Caveat Brush',cursive;color:#8f5a0c;font-size:13pt}
.marca{position:absolute;right:-4mm;top:-6mm;font-family:'Caveat Brush',cursive;font-size:24pt;color:#8f5a0c;transform:rotate(8deg);text-shadow:0 0 2mm #fff}
.tipo{color:#a9a89e;font-size:10pt}
h2{font-family:'Bodoni Moda',serif;font-weight:700;font-size:25pt;line-height:1.05;margin:1.5mm 0 4mm}
.precio{display:flex;align-items:baseline;gap:4mm;flex-wrap:wrap}
.precio b{font-size:27pt;font-stretch:85%;font-weight:700}
.precio s{color:#a9a89e;text-decoration:none;position:relative;font-size:12pt}
.precio s::after{content:"";position:absolute;left:-1mm;right:-1mm;top:52%;height:.6mm;background:#f0a22e;transform:rotate(-6deg)}
.por{color:#a9a89e;font-size:10pt;margin-top:1mm}
.desc{color:#cfcec6;font-size:11pt;line-height:1.5;margin-top:5mm}
ul{list-style:none;margin-top:5mm;display:grid;gap:2.4mm}
li{padding-left:6mm;position:relative;font-size:10.5pt;line-height:1.4;color:#e1e0d8}
li::before{content:"";position:absolute;left:.5mm;top:.62em;width:3mm;height:.6mm;background:#f0a22e}
.otras{margin:8mm 16mm 0}
.otras h3{font-family:'Caveat Brush',cursive;color:#f0a22e;font-size:15pt;font-weight:400;margin-bottom:3mm}
.contactos{background:#161613;padding:4.5mm 4mm;display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;position:relative}
.contactos::before,.contactos::after{content:"";position:absolute;left:0;right:0;height:1.8mm;background:repeating-linear-gradient(90deg,transparent 0 1.6mm,#45463f 1.6mm 3.6mm,transparent 3.6mm 5.6mm)}
.contactos::before{top:1.2mm}.contactos::after{bottom:1.2mm}
.contactos div{display:grid;gap:1mm}
.contactos img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}
.contactos b{font-size:8.5pt;font-weight:600;color:#e9e8e1;line-height:1.2}
.contactos span{font-size:8.5pt;color:#f0a22e;font-stretch:85%;font-weight:700}
.cond{margin:6mm 16mm 0;border-top:.3mm solid #45463f;padding-top:5mm;display:grid;grid-template-columns:repeat(3,1fr);gap:6mm}
.cond p{font-size:9pt;color:#cfcec6;line-height:1.45}
.pie-pag{margin-top:auto;flex:none;background:#f4f3ee;color:#22231f;padding:7mm 16mm;display:flex;justify-content:space-between;align-items:center;gap:8mm}
.pie-pag .wa{font-weight:700;font-size:13pt}
.pie-pag .wa small{display:block;font-weight:500;font-size:9pt;color:#3b3c36}
.pie-pag .der{text-align:right;font-size:9pt;color:#3b3c36;line-height:1.5}
.pie-pag .der b{color:#22231f}
"""

def esc(x): return html.escape(str(x))

def page(cat, it, otras):
    cond = CONDICIONES.get(cat["id"], CONDICIONES["default"])
    marca = f'<span class="marca">{esc(it["d"])}</span>' if it.get("d") else ""
    strike = f'<s>{esc(it["s"])}</s>' if it.get("s") else ""
    por = f'<div class="por">{esc(it["por"])}</div>' if it.get("por") else ""
    desc = f'<p class="desc">{esc(it["desc"])}</p>' if it.get("desc") else ""
    inc = "".join(f"<li>{esc(x)}</li>" for x in it.get("inc") or [])
    ancha = " ancha" if it.get("ar") else ""
    otras_html = ""
    if otras:
        celdas = "".join(f'<div><img src="{BASE}/img/{esc(o["img"])}.jpg"><b>{esc(o["n"])}</b><span>{esc(o["p"])}</span></div>' for o in otras)
        otras_html = f'<div class="otras"><h3>otras opciones de {esc(cat["nav"].lower())}</h3><div class="contactos">{celdas}</div></div>'

    return f"""<!doctype html><html lang="es"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,500;6..96,700&family=Archivo:wdth,wght@75..100,400..700&family=Caveat+Brush&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body>
<div class="top">
  <h1>Edson Penagos</h1>
  <div class="firma">El de las Fotos Chimbitas · fotógrafo y videógrafo</div>
  <div class="sec">{esc(cat["titulo"])}</div>
  <div class="tira"><span>CHIMBITAS 400 ▸ {esc(it["n"].upper())} ▸ MÁLAGA · SANTANDER ▸ 2026</span></div>
</div>
<div class="cuerpo">
  <div class="copia{ancha}"><img src="{BASE}/img/{esc(it["img"])}.jpg">{marca}<span class="pie">{esc(it["n"])}</span></div>
  <div>
    <div class="tipo">{esc(it.get("t") or cat["nav"])}</div>
    <h2>{esc(it["n"])}</h2>
    <div class="precio"><b>{esc(it["p"])}</b>{strike}</div>{por}
    {desc}<ul>{inc}</ul>
  </div>
</div>
{otras_html}
<div class="cond">{"".join(f"<p>{esc(c)}</p>" for c in cond)}</div>
<div class="pie-pag">
  <div class="wa">WhatsApp +57 313 346 9261<small>Escríbeme con nombre, fecha, hora, ciudad y servicio</small></div>
  <div class="der"><b>eldelasfotoschimbitas.github.io/precios</b><br>Instagram @eldelasfotoschimbitas · TikTok @fotos.chimbitas<br>Precios en pesos colombianos (COP)</div>
</div>
</body></html>"""

with sync_playwright() as pw:
    br = pw.chromium.launch()
    pg = br.new_page()
    pg.goto(BASE + "/", wait_until="networkidle")
    cats = pg.evaluate("CATS")
    slugs = pg.evaluate("CATS.filter(c => c.tipo === 'copias').flatMap(c => c.items.map(it => slug(it.n)))")
    i = 0
    for c in cats:
        if c["tipo"] != "copias":
            continue
        for it in c["items"]:
            if not it.get("img") or (SOLO and slugs[i] not in SOLO):
                i += 1; continue
            resto = [o for o in c["items"] if o is not it and o["n"] != it["n"] and o.get("img")][:4]
            pg.set_content(page(c, it, resto), wait_until="networkidle")
            pg.evaluate("document.fonts.ready")
            out = OUT / f"{slugs[i]}.pdf"
            pg.pdf(path=str(out), format="A4", print_background=True, prefer_css_page_size=True)
            print(out.name, out.stat().st_size // 1024, "KB")
            i += 1
    br.close()

# vistas previas para el visor de la página (pdf/ver/<slug>.webp)
try:
    import fitz, io
    from PIL import Image
    (OUT / "ver").mkdir(exist_ok=True)
    for f in sorted(OUT.glob("*.pdf")):
        if SOLO and f.stem not in SOLO:
            continue
        pix = fitz.open(f)[0].get_pixmap(dpi=170)
        Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB").save(OUT / "ver" / (f.stem + ".webp"), "WEBP", quality=82, method=6)
    print("vistas previas listas")
except ImportError:
    print("instala pymupdf y pillow para generar las vistas previas")
