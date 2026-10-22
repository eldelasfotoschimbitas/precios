/* Portafolio: filtros por categoría, "ver más" por filas completas (mín. 12) y visor con la foto completa. */
(() => {
  const fotos = window.PORTA || [], cats = (window.PORTA_CATS || []).filter(([c]) => fotos.some(f => f.c === c));   // sin categorías vacías
  const filtros = document.getElementById("pfFiltros"), grid = document.getElementById("pfGrid"), mas = document.getElementById("pfMas");
  if (!grid || !fotos.length) return;
  const nombre = Object.fromEntries(cats);
  const PASO = 12;   // mínimo por tanda; se redondea a filas completas (con 5 columnas salen 15)
  let actual = "todas", mostradas = 0;
  const columnas = () => getComputedStyle(grid).gridTemplateColumns.split(" ").length || 1;

  document.getElementById("pfTotal").textContent = `${fotos.length} fotos`;
  const nCats = document.getElementById("pfCats"); if (nCats) nCats.textContent = `${cats.length} categorías`;
  const cuenta = c => c === "todas" ? fotos.length : fotos.filter(f => f.c === c).length;
  filtros.innerHTML = [["todas", "Todas"], ...cats].map(([c, n]) =>
    `<button type="button" role="tab" data-c="${c}" aria-selected="${c === actual}">${n} <small>${cuenta(c)}</small></button>`).join("");

  // en cada categoría manda "o" (lo más llamativo primero, luego por grupos); sin "o" queda el orden del arreglo
  const lista = () => actual === "todas" ? fotos : fotos.filter(f => f.c === actual).map((f, i) => [f.o ?? 1e6 + i, f]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const pieza = (f, i) => `<button type="button" class="pf-item" data-i="${i}" aria-label="Ver foto de ${nombre[f.c]}">
      <img src="img/p/${f.f}.webp" alt="" width="400" height="500" loading="lazy" decoding="async"><span>${nombre[f.c]}</span></button>`;

  function pintar(desde, minimo = PASO){
    const l = lista(), col = columnas(), hasta = Math.min(l.length, Math.ceil((desde + minimo) / col) * col);
    const html = l.slice(desde, hasta).map((f, k) => pieza(f, desde + k)).join("");
    if (desde === 0) grid.innerHTML = html; else grid.insertAdjacentHTML("beforeend", html);
    mostradas = hasta;
    mas.parentElement.hidden = mostradas >= l.length;
    mas.textContent = `Ver más fotos (${l.length - mostradas})`;
  }
  pintar(0);

  filtros.addEventListener("click", e => {
    const b = e.target.closest("button[data-c]"); if (!b || b.dataset.c === actual) return;
    actual = b.dataset.c;
    filtros.querySelectorAll("button").forEach(x => x.setAttribute("aria-selected", x === b));
    b.scrollIntoView({block: "nearest", inline: "center", behavior: "smooth"});
    const cambiar = () => pintar(0);
    if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) document.startViewTransition(cambiar); else cambiar();
  });
  mas.addEventListener("click", () => pintar(mostradas));
  // si cambia el número de columnas (girar el celular, achicar la ventana), completar la última fila
  let cols = columnas();
  addEventListener("resize", () => {
    const c = columnas(); if (c === cols) return; cols = c;
    if (mostradas < lista().length && mostradas % c) pintar(mostradas, 0);
  });
  grid.addEventListener("click", e => {
    const it = e.target.closest(".pf-item"); if (!it || !window.abrirVisor) return;
    window.abrirVisor(+it.dataset.i, lista().map(f => `img/pf/${f.f}.webp`));
  });
})();
