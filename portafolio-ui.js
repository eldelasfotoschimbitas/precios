/* Portafolio: filtros por categoría, filas justificadas (cada foto en su formato original, todas las de una
   fila con la misma altura y llenando el ancho), primera fila más grande, "ver más" por filas completas,
   reels con vista previa en silencio y visor con la foto completa o el reel de Instagram. */
(() => {
  const fotos = window.PORTA || [], cats = (window.PORTA_CATS || []).filter(([c]) => fotos.some(f => f.c === c));   // sin categorías vacías
  const filtros = document.getElementById("pfFiltros"), grid = document.getElementById("pfGrid"), mas = document.getElementById("pfMas");
  if (!grid || !fotos.length) return;
  const nombre = Object.fromEntries(cats);
  let actual = "todas", mostradas = 0, ancho = 0;

  const nFotos = fotos.filter(f => !f.v).length, nVideos = fotos.length - nFotos;
  document.getElementById("pfTotal").textContent = `${nFotos} fotos` + (nVideos ? ` · ${nVideos} videos` : "");
  const nCats = document.getElementById("pfCats"); if (nCats) nCats.textContent = `${cats.length} categorías`;
  const cuenta = c => c === "todas" ? fotos.length : fotos.filter(f => f.c === c).length;
  filtros.innerHTML = [["todas", "Todas"], ...cats].map(([c, n]) =>
    `<button type="button" role="tab" data-c="${c}" aria-selected="${c === actual}">${n} <small>${cuenta(c)}</small></button>`).join("");

  // en cada categoría manda "o" (lo más llamativo primero, luego por grupos); sin "o" queda el orden del arreglo
  const lista = () => actual === "todas" ? fotos : fotos.filter(f => f.c === actual).map((f, i) => [f.o ?? 1e6 + i, f]).sort((a, b) => a[0] - b[0]).map(x => x[1]);

  // medidas según pantalla: altura objetivo de fila, primera fila más alta, separación y filas por tanda
  const medidas = () => {
    const w = grid.clientWidth, cel = w < 600;
    return {W: w, H: cel ? 170 : w < 1000 ? 230 : 290, H0: cel ? 260 : w < 1000 ? 340 : 430, gap: cel ? 6 : 10, inicio: cel ? 5 : 3, paso: cel ? 6 : 4};
  };

  // parte la lista en filas: corta donde la altura queda más cerca del objetivo
  function filas(l, m){
    const out = []; let fila = [], suma = 0;
    for (let i = 0; i < l.length; i++){
      const a = l[i].w / l[i].h, H = out.length ? m.H : m.H0;
      const hCon = (m.W - m.gap * fila.length) / (suma + a);
      if (fila.length && hCon < H){
        const hSin = (m.W - m.gap * (fila.length - 1)) / suma;
        if (Math.abs(hSin - H) <= Math.abs(hCon - H)){ out.push({idx: fila, h: hSin}); fila = [i]; suma = a; continue; }
        fila.push(i); suma += a; out.push({idx: fila, h: hCon}); fila = []; suma = 0; continue;
      }
      fila.push(i); suma += a;
    }
    if (fila.length) out.push({idx: fila, h: out.length ? m.H : m.H0, coja: true});
    return out;
  }

  const pieza = (f, i, w, h) => {
    const video = !f.v ? "" : (f.pv ? `<video muted loop playsinline preload="none" data-src="vid/pf/${f.f}.mp4"></video>` : "") + `<b class="pf-play" aria-hidden="true"></b>`;
    return `<button type="button" class="pf-item${f.v ? " es-video" : ""}" data-i="${i}" style="${w ? `width:${w}px;` : ""}height:${h}px" aria-label="${f.v ? "Ver video" : "Ver foto"} ${f.f} de ${nombre[f.c]}">
      <img data-src="img/p/${f.f}.webp" alt="${nombre[f.c]} ${f.f}" width="${f.w}" height="${f.h}" decoding="async" onload="this.classList.add('ok')">${video}<span>${f.f}</span></button>`;
  };
  // una fila: fuera de pantalla el navegador no la dibuja (content-visibility) y guarda su alto
  const filaHTML = (l, fila, m) => {
    const h = Math.round(fila.h), coja = fila.coja;
    return `<div class="pf-fila${coja ? " coja" : ""}" style="gap:${m.gap}px;margin-bottom:${m.gap}px;contain-intrinsic-size:auto ${h}px">` +
      fila.idx.map(i => pieza(l[i], i, coja ? Math.round(l[i].w / l[i].h * fila.h) : 0, h)).join("") + "</div>";
  };
  const estirar = (l, raiz) => raiz.querySelectorAll(".pf-fila:not(.coja) .pf-item").forEach(b => { const f = l[+b.dataset.i]; b.style.flex = `${f.w / f.h} 1 0`; });
  function cerrar(l){
    mas.parentElement.hidden = mostradas >= l.length;
    mas.textContent = `Ver más (${l.length - mostradas})`;
  }

  // pinta desde cero hasta completar al menos "cuantas" fotos en filas completas
  function pintar(cuantas){
    const l = lista(), m = medidas(), fs = filas(l, m);
    ancho = m.W;
    let html = "", n = 0;
    for (const fila of fs){
      if (n >= cuantas && n > 0) break;
      html += filaHTML(l, fila, m);
      n += fila.idx.length;
    }
    grid.innerHTML = html;
    estirar(l, grid);
    mostradas = n;
    cerrar(l);
    vigilarVideos(grid);
  }
  // "Ver más": agrega solo las filas nuevas (las fotos ya cargadas no se vuelven a pintar)
  function agregar(){
    const l = lista(), m = medidas(), fs = filas(l, m);
    let n = 0, k = 0;
    while (k < fs.length && n < mostradas) n += fs[k++].idx.length;
    const nuevas = fs.slice(k, k + m.paso);
    const caja = document.createElement("div");
    caja.innerHTML = nuevas.map(f => filaHTML(l, f, m)).join("");
    estirar(l, caja);
    vigilarVideos(caja);
    grid.append(...caja.children);
    mostradas = n + nuevas.reduce((a, f) => a + f.idx.length, 0);
    cerrar(l);
  }
  // reels: la vista previa corre en silencio solo mientras se ve bien, máximo 3 a la vez;
  // con ahorro de datos o movimiento reducido se queda la portada quieta
  const ahorro = (navigator.connection && navigator.connection.saveData) || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const corriendo = new Set();
  const io = !ahorro && "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting && corriendo.size < 3){ if (!v.src) v.src = v.dataset.src; corriendo.add(v); v.play().catch(() => {}); }
    else if (!e.isIntersecting){ corriendo.delete(v); v.pause(); }
  }), {threshold: .6}) : null;
  function vigilarVideos(raiz){
    // fotos: cada fila baja sus miniaturas solo cuando está a ~800 px de verse (no se usa loading="lazy":
    // durante la entrada de la página el portafolio queda cerca y el navegador las bajaría todas)
    raiz.querySelectorAll(".pf-fila").forEach(f => carga ? carga.observe(f) : cargar(f));
    if (!io) return;
    corriendo.forEach(v => { if (!v.isConnected) corriendo.delete(v); });
    raiz.querySelectorAll("video").forEach(v => io.observe(v));
  }
  function cargar(fila){
    fila.querySelectorAll("img[data-src]").forEach(i => { i.src = i.dataset.src; i.removeAttribute("data-src"); });
    fila.querySelectorAll("video").forEach(v => { if (!v.poster) v.poster = v.parentElement.querySelector("img").src; });
  }
  const carga = "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting && document.documentElement.scrollHeight > innerHeight * 3){ cargar(e.target); carga.unobserve(e.target); }
  }), {rootMargin: "800px 0px"}) : null;

  // cuántos elementos caben en las primeras k filas
  const enFilas = k => filas(lista(), medidas()).slice(0, k).reduce((a, f) => a + f.idx.length, 0);
  const inicio = () => pintar(enFilas(medidas().inicio));
  inicio();

  filtros.addEventListener("click", e => {
    const b = e.target.closest("button[data-c]"); if (!b || b.dataset.c === actual) return;
    actual = b.dataset.c;
    filtros.querySelectorAll("button").forEach(x => x.setAttribute("aria-selected", x === b));
    filtros.scrollTo({left: b.offsetLeft - (filtros.clientWidth - b.offsetWidth) / 2, behavior: "smooth"});
    if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) document.startViewTransition(inicio).ready.catch(() => {});   // si se cambia rápido de filtro, la transición se salta
    else inicio();
  });
  mas.addEventListener("click", agregar);
  // al cambiar el ancho se rearman las filas con las mismas fotos (completando la última fila)
  let espera;
  addEventListener("resize", () => { clearTimeout(espera); espera = setTimeout(() => { if (grid.clientWidth !== ancho) pintar(mostradas); }, 150); });

  grid.addEventListener("click", e => {
    const it = e.target.closest(".pf-item"); if (!it || !window.abrirVisor) return;
    window.abrirVisor(+it.dataset.i, lista().map(f => f.v ? {ig: f.v, n: f.f} : {src: `img/pf/${f.f}.webp`, n: f.f}));
  });
})();
