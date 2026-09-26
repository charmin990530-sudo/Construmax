'use strict';

/* =========================================================
   CONSTRUMAX — Lógica de la aplicación
   Módulos independientes (IIFE). Router por hash para que
   funcione abriendo el archivo con doble clic (file://).
   ========================================================= */

const WA_BASE = 'https://wa.me/573000000000';
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse  = window.matchMedia('(hover: none)').matches;

/* =========================================================
   UTILIDADES
   ========================================================= */
const U = (function () {
  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function raf(fn) {
    let q = false;
    return function () { if (q) return; q = true; requestAnimationFrame(() => { q = false; fn(); }); };
  }

  const SEL = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function trap(node) {
    function onKey(e) {
      if (e.key !== 'Tab') return;
      const items = $$(SEL, node).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const f = items[0], l = items[items.length - 1];
      if (e.shiftKey && document.activeElement === f) { e.preventDefault(); l.focus(); }
      else if (!e.shiftKey && document.activeElement === l) { e.preventDefault(); f.focus(); }
    }
    node.addEventListener('keydown', onKey);
    return () => node.removeEventListener('keydown', onKey);
  }

  const money = (n) => '$' + n.toLocaleString('es-CO');
  return { $, $$, esc, raf, trap, money };
})();

const { $, $$, esc, raf, trap, money } = U;

/* =========================================================
   DATOS
   ========================================================= */
const DATA = [
  {
    id: 'chapinero-alto', n: '01',
    name: 'Torre Chapinero Alto', cat: 'residencial', status: 'En obra', rawStatus: 'En Construcción',
    loc: 'Chapinero, Bogotá', price: 450000000, area: 78, floors: 24, delivery: 'Q3 2027', progress: 62,
    beds: 2, baths: 2,
    img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=1400&auto=format&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=600&auto=format&fit=crop',
    desc: 'Torre residencial de 24 pisos con 96 apartamentos tipo studio y dos alcobas. Fachada ventilada con ladrillo de alto desempeño, control solar en la cara oeste y zonas comunes tipo hotel: gimnasio, terraza panorámica y sala de coworking.',
    amen: ['Gimnasio equipado', 'Terraza panorámica', 'Sala de coworking', 'Paradero de visitantes', 'Salón de fiestas', 'Mascotas permitidas']
  },
  {
    id: 'santa-ana', n: '02',
    name: 'Residencial Santa Ana', cat: 'residencial', status: 'En venta', rawStatus: 'En Venta',
    loc: 'Santa Ana, Bogotá', price: 620000000, area: 95, floors: 18, delivery: 'Entregado Q1 2026', progress: 100,
    beds: 3, baths: 2,
    img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1400&auto=format&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=600&auto=format&fit=crop',
    desc: 'Proyecto entregado de 18 pisos en el barrio Santa Ana. Certificación LEED Plata, espacios flexibles y una azotea verde que reduce la isla de calor del sector. Ya hay unidades habitadas.',
    amen: ['LEED Plata', 'Azotea verde', 'Solárium', 'Cicloparking', 'Club familiar', 'Jardineras']
  },
  {
    id: 'calle-100', n: '03',
    name: 'Centro Empresarial Calle 100', cat: 'comercial', status: 'En venta', rawStatus: 'En Venta',
    loc: 'Calle 100, Bogotá', price: 980000000, area: 140, floors: 12, delivery: 'Q4 2026', progress: 88,
    img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1400&auto=format&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600&auto=format&fit=crop',
    desc: 'Oficinas AAA en el eje de la Calle 100. Pisos completos desde 140 m² con altura libre de 3,1 m, fibra óptica dedicada y control de acceso biométrico. Pensado para empresas consolidadas que buscan una dirección de primer nivel.',
    amen: ['Pisos completos', 'Fibra óptica dedicada', 'Acceso biométrico', 'Zona de bienestar', 'Sala de juntas', 'Ascensor doble']
  },
  {
    id: 'alto-usaquen', n: '04',
    name: 'Alto de Usaquén Residence', cat: 'planos', status: 'Sobre planos', rawStatus: 'Sobre Planos',
    loc: 'Usaquén, Bogotá', price: 390000000, area: 68, floors: 10, delivery: 'Q2 2028', progress: 12,
    beds: 1, baths: 1,
    img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1400&auto=format&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&auto=format&fit=crop',
    desc: 'Proyecto en fase de anteproyecto en el sector de Usaquén. 10 pisos, apartamentos de una y dos alcobas con diseño actualizado y descuento del 30% sobre la cuota de administración durante la preventa.',
    amen: ['Una y dos alcobas', 'Crédito hipotecario', 'Zona tranquila', 'Bodega por unidad', 'Ampliación futura']
  },
  {
    id: 'plaza-salitre', n: '05',
    name: 'Plaza Corporativa Salitre', cat: 'comercial', status: 'En obra', rawStatus: 'En Construcción',
    loc: 'Salitre, Bogotá', price: 1250000000, area: 210, floors: 9, delivery: 'Q1 2028', progress: 41,
    img: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?q=80&w=1400&auto=format&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?q=80&w=600&auto=format&fit=crop',
    desc: 'Complejo corporativo de 9 pisos con dos torres y 4.200 m² de oficinas. Placa tectónica, terrazas verdes por nivel y generación solar de 180 kWp en cubierta.',
    amen: ['Dos torres', 'Terrazas verdes', 'Generación solar 180 kWp', 'Placa tectónica', 'Estacionamiento visitantes']
  },
  {
    id: 'reserva-country', n: '06',
    name: 'Reserva del Country', cat: 'planos', status: 'Sobre planos', rawStatus: 'Sobre Planos',
    loc: 'El Country, Bogotá', price: 710000000, area: 102, floors: 14, delivery: 'Q4 2027', progress: 8,
    beds: 3, baths: 3,
    img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=1400&auto=format&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=600&auto=format&fit=crop',
    desc: 'Catorce residenciales sobre planos en El Country. Cada proyecto se entrega con cocina equipada, parqueadero privado y 8 años de garantía estructural y de impermeabilización.',
    amen: ['Cocina equipada', 'Paradero privado', 'Ocho años de garantía', 'Bodega por unidad', 'Zonas verdes']
  }
];

const CAT = { residencial: 'Residencial', comercial: 'Comercial', planos: 'Sobre planos' };

/* Imágenes del proceso constructivo */
const STAGES = [
  { t: 'Etapa 01 — Diseño y planos',
    i: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1200&auto=format&fit=crop',
    a: 'Arquitecto revisando planos de estructura' },
  { t: 'Etapa 02 — Cimentación',
    i: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=1200&auto=format&fit=crop',
    a: 'Montaje de acero en obra' },
  { t: 'Etapa 03 — Estructura y fachada',
    i: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=1200&auto=format&fit=crop',
    a: 'Grúas en obra de estructura' },
  { t: 'Etapa 04 — Entrega de llaves',
    i: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop',
    a: 'Torres terminadas en el skyline de Bogotá' }
];

/* =========================================================
   ÍNDICE DE PROYECTOS
   ========================================================= */
const Index = (function () {
  const COLS = '3rem minmax(0,1fr) 13rem 6rem 10rem 2.5rem';

  function head() {
    return '<div class="idx__h" style="--cols:' + COLS + '">' +
      ['N°', 'Proyecto', 'Ubicación', 'Área', 'Estado', '']
        .map((h) => '<span class="mono t-3">' + h + '</span>').join('') + '</div>';
  }

  function row(p) {
    return '<a class="idx__row" href="#/proyecto/' + esc(p.id) + '"' +
      ' data-peek="' + esc(p.thumb) + '" data-peekn="' + esc(p.name) + '">' +
      '<span class="idx__n mono t-3">' + p.n + '</span>' +
      '<span class="idx__main">' +
        '<span class="idx__name">' + esc(p.name) + '</span>' +
        '<span class="idx__cat">' + esc(CAT[p.cat]) + '</span>' +
      '</span>' +
      '<span class="idx__loc">' + esc(p.loc) + '</span>' +
      '<span class="idx__num">' + p.area + ' m²</span>' +
      '<span class="idx__st" data-s="' + esc(p.rawStatus) + '"><i aria-hidden="true"></i>' + esc(p.status) + '</span>' +
      '<span class="idx__go" aria-hidden="true"><svg class="ic"><use href="#i-diag"/></svg></span>' +
      '</a>';
  }

  function render(target, list) {
    const host = $(target);
    if (!host) return;
    const items = list || DATA;
    host.innerHTML = head() + (items.length
      ? items.map(row).join('')
      : '<div class="empty"><strong>Sin proyectos en esta categoría</strong><p>Estamos preparando nuevas opciones. Escríbenos y te avisamos cuando abramos cupos.</p></div>');
  }

  function filter(cat) {
    const items = cat === 'todos' ? DATA : DATA.filter((p) => p.cat === cat);
    render('#allIdx', items);
    $$('.tab').forEach((t) => {
      const on = t.dataset.filter === cat;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-pressed', String(on));
    });
    const st = $('#filterSt');
    if (st) st.textContent = 'Mostrando ' + String(items.length).padStart(2, '0') +
      ' de ' + String(DATA.length).padStart(2, '0') +
      (cat === 'todos' ? '' : ' · ' + CAT[cat]);
  }

  /* Vista previa que sigue al cursor */
  const Peek = (function () {
    const box = $('#peek'), img = $('#peekImg'), tag = $('#peekN');
    let rafId = 0, tx = 0, ty = 0, cx = 0, cy = 0, on = false;

    function loop() {
      cx += (tx - cx) * 0.16;
      cy += (ty - cy) * 0.16;
      box.style.transform = 'translate3d(' + (cx + 24) + 'px,' + (cy - 150) + 'px,0)';
      rafId = requestAnimationFrame(loop);
    }
    function start() { if (!rafId) loop(); }

    function show(src, name) {
      if (!box) return;
      img.src = src; tag.textContent = name;
      box.hidden = false;
      requestAnimationFrame(() => box.classList.add('is-on'));
      on = true; start();
    }
    function hide() {
      if (!box || !on) return;
      box.classList.remove('is-on'); on = false;
      setTimeout(() => { if (!on) box.hidden = true; }, 400);
    }

    if (!coarse) {
      document.addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
      document.addEventListener('mouseover', (e) => {
        const r = e.target.closest('[data-peek]');
        if (r) show(r.dataset.peek, r.dataset.peekn);
      });
      document.addEventListener('mouseout', (e) => {
        if (e.target.closest('[data-peek]')) hide();
      });
      window.addEventListener('scroll', hide, { passive: true });
    }
    return { show, hide };
  })();

  return { render, filter, Peek };
})();

/* =========================================================
   FICHA DE PROYECTO — página completa
   ========================================================= */
const Project = (function () {
  function specs(p) {
    const out = [['Área privada', p.area + ' m²'], ['Pisos', String(p.floors)], ['Entrega', p.delivery], ['Avance de obra', p.progress + '%']];
    if (p.beds) out.push(['Alcobras', String(p.beds)]);
    if (p.baths) out.push(['Baños', String(p.baths)]);
    out.push(['Valor desde (COP)', money(p.price)]);
    return out;
  }

  function page(p) {
    const i = DATA.findIndex((x) => x.id === p.id);
    const next = DATA[(i + 1) % DATA.length];
    return '' +
    '<div class="shell pj">' +
      '<a class="pj__back" href="#/proyectos"><svg class="ic" aria-hidden="true"><use href="#i-arrow"/></svg> Volver al catálogo</a>' +

      '<header class="pj__head">' +
        '<div>' +
          '<p class="mono kicker"><span class="kicker__tick"></span>' + esc(CAT[p.cat]) + ' · ' + esc(p.status) + '</p>' +
          '<h1 class="pj__title">' + esc(p.name) + '</h1>' +
        '</div>' +
        '<div class="pj__meta">' +
          '<div class="pj__row"><span>Ubicación</span><span>' + esc(p.loc) + '</span></div>' +
          '<div class="pj__row"><span>Estado</span><span>' + esc(p.status) + '</span></div>' +
          '<div class="pj__row"><span>Avance</span><span>' + p.progress + '%</span></div>' +
        '</div>' +
      '</header>' +

      '<figure class="pj__hero">' +
        '<img src="' + esc(p.img) + '" alt="Fachada de ' + esc(p.name) + '" fetchpriority="high" decoding="async" width="1600" height="900">' +
        '<figcaption class="caption"><span class="mono">Fig. ' + p.n + '</span><span>' + esc(p.name) + ' — ' + esc(p.loc) + '.</span></figcaption>' +
      '</figure>' +

      '<div class="pj__body">' +
        '<div>' +
          '<p class="mono label">El proyecto</p>' +
          '<p class="body body--lead">' + esc(p.desc) + '</p>' +
          '<div class="pj__specs">' +
            specs(p).map((s) => '<div class="pj__spec"><span>' + esc(s[0]) + '</span><strong>' + esc(s[1]) + '</strong></div>').join('') +
          '</div>' +
          '<div class="pj__act">' +
            '<button class="btn btn--ink" type="button" data-wa-msg="Quiero cotizar el proyecto &quot;' + esc(p.name) + '&quot; en ' + esc(p.loc) + '">' +
              '<svg class="ic" aria-hidden="true"><use href="#i-wa"/></svg> Cotizar por WhatsApp</button>' +
            '<a class="btn btn--line" href="#/contacto">Agendar visita</a>' +
          '</div>' +
        '</div>' +
        '<aside>' +
          '<p class="mono label">Amenidades</p>' +
          '<ul class="pj__amen">' +
            p.amen.map((a) => '<li><svg class="ic" aria-hidden="true"><use href="#i-check"/></svg>' + esc(a) + '</li>').join('') +
          '</ul>' +
        '</aside>' +
      '</div>' +

      '<a class="pj__next link" href="#/proyecto/' + esc(next.id) + '">Siguiente proyecto · ' + esc(next.name) + ' <svg class="ic" aria-hidden="true"><use href="#i-arrow"/></svg></a>' +
    '</div>';
  }

  function open(id) {
    const p = DATA.find((x) => x.id === id);
    const host = $('#projContent');
    if (!p || !host) { location.hash = '#/proyectos'; return false; }

    host.innerHTML = page(p);
    document.title = p.name + ' — Bogotá | CONSTRUMAX';
    const md = $('meta[name="description"]');
    if (md) md.setAttribute('content', p.desc.slice(0, 158));
    return true;
  }

  return { open };
})();

/* =========================================================
   ROUTER
   ========================================================= */
const Router = (function () {
  const SEO = {
    inicio: {
      t: 'CONSTRUMAX — Constructora en Bogotá | Proyectos residenciales y comerciales',
      d: 'CONSTRUMAX, constructora en Bogotá desde 2007. Torres residenciales y centros empresariales con ingeniería sismo-resistente bajo la NSR-10 y estándares de sostenibilidad LEED.'
    },
    nosotros: {
      t: 'Nosotros — 18 años construyendo en Bogotá | CONSTRUMAX',
      d: 'Conoce CONSTRUMAX: constructora bogotana fundada en 2007. Misión, visión, valores, cronología y equipo técnico propio de ingenieros y arquitectos.'
    },
    proyectos: {
      t: 'Proyectos en Bogotá — Residenciales y comerciales | CONSTRUMAX',
      d: 'Catálogo de proyectos activos: torres residenciales, centros empresariales y edificios sobre planos en Bogotá. Fichas técnicas y valores desde.'
    },
    contacto: {
      t: 'Contacto y cotización — Sala de ventas Usaquén | CONSTRUMAX',
      d: 'Escríbenos o visítanos en Teleport Business Park, Usaquén, Bogotá. Respondemos en menos de 48 horas hábiles.'
    }
  };

  function parse() {
    const raw = (location.hash || '').replace(/^#\/?/, '');
    const seg = raw.split('/').filter(Boolean);
    if (seg[0] === 'proyecto' && seg[1]) return { page: 'proyecto', id: seg[1] };
    return { page: SEO[seg[0]] ? seg[0] : 'inicio', id: null };
  }

  function render(route) {
    $$('.page').forEach((p) => {
      const on = p.id === 'page-' + route.page;
      p.hidden = !on;
      p.classList.toggle('is-entering', on);
    });

    /* La ficha de proyecto cuelga del catálogo, así que "Proyectos" queda activo */
    const activeNav = route.page === 'proyecto' ? 'proyectos' : route.page;
    $$('.navlink[data-nav]').forEach((a) => {
      const on = a.dataset.nav === activeNav;
      a.classList.toggle('is-on', on);
      if (on) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    if (route.page === 'proyecto') {
      if (!Project.open(route.id)) return;
    } else {
      document.title = SEO[route.page].t;
      const md = $('meta[name="description"]');
      if (md) md.setAttribute('content', SEO[route.page].d);
    }

    Drawer.close();
    WA.close();
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    const main = $('#contenido');
    if (main) main.focus({ preventScroll: true });

    Reveal.scan();
    if (route.page === 'inicio') { Proc.refresh(); Counters.replay(); }
  }

  function init() {
    window.addEventListener('hashchange', () => render(parse()));
    render(parse());
  }

  return { init };
})();

/* =========================================================
   DRAWER MÓVIL
   ========================================================= */
const Drawer = (function () {
  const el = $('#drawer'), burger = $('#burger');
  let open = false, release = null;

  function openIt() {
    if (!el || open) return;
    open = true;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('is-open'));
    if (burger) {
      burger.setAttribute('aria-expanded', 'true');
      burger.setAttribute('aria-label', 'Cerrar menú');
    }
    document.body.style.overflow = 'hidden';
    const first = el.querySelector('a');
    if (first) setTimeout(() => first.focus(), 60);
    release = trap(el);
  }

  function close() {
    if (!el || !open) return;
    open = false;
    el.classList.remove('is-open');
    if (burger) {
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Abrir menú');
    }
    document.body.style.overflow = '';
    if (release) { release(); release = null; }
    setTimeout(() => { if (!open) el.hidden = true; }, 340);
  }

  function init() {
    if (burger) burger.addEventListener('click', () => (open ? close() : openIt()));
    if (el) el.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    window.addEventListener('resize', () => { if (open && window.innerWidth >= 940) close(); });
  }

  return { init, open: openIt, close };
})();

/* =========================================================
   WHATSAPP
   ========================================================= */
const WA = (function () {
  const panel = $('#waPanel'), fab = $('.wa');
  let open = false, release = null;

  function show() {
    if (!panel || open) return;
    open = true;
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('is-open'));
    if (fab) fab.setAttribute('aria-expanded', 'true');
    const first = panel.querySelector('button');
    if (first) setTimeout(() => first.focus(), 60);
    release = trap(panel);
  }

  function close() {
    if (!panel || !open) return;
    open = false;
    panel.classList.remove('is-open');
    if (fab) fab.setAttribute('aria-expanded', 'false');
    if (release) { release(); release = null; }
    setTimeout(() => { if (!open) panel.hidden = true; }, 340);
  }

  function init() {
    $$('[data-wa-open]').forEach((b) => b.addEventListener('click', () => (open ? close() : show())));
    $$('[data-wa-close]').forEach((b) => b.addEventListener('click', close));
    document.addEventListener('click', (e) => {
      const m = e.target.closest('[data-wa-msg]');
      if (!m) return;
      window.open(WA_BASE + '?text=' + encodeURIComponent('Hola CONSTRUMAX. ' + m.dataset.waMsg), '_blank', 'noopener');
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) close(); });
  }

  return { init, close };
})();

/* =========================================================
   REVEAL
   ========================================================= */
const Reveal = (function () {
  let obs = null;
  function scan() {
    if (!obs) {
      obs = new IntersectionObserver((ents) => {
        ents.forEach((en) => {
          if (!en.isIntersecting) return;
          en.target.classList.add('in-view');
          obs.unobserve(en.target);
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    }
    $$('.reveal:not(.in-view), .stagger:not(.in-view)').forEach((el) => obs.observe(el));
  }
  return { scan };
})();

/* =========================================================
   CONTADORES
   ========================================================= */
const Counters = (function () {
  const seen = new WeakSet();
  let obs = null;

  function animate(el) {
    const target = parseInt(el.dataset.target, 10);
    if (reduced) { el.textContent = target.toLocaleString('es-CO'); return; }
    const dur = 1400, t0 = performance.now();
    (function tick(now) {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(e * target).toLocaleString('es-CO');
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  function init() {
    const els = $$('.counter');
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => { el.textContent = parseInt(el.dataset.target, 10).toLocaleString('es-CO'); });
      return;
    }
    obs = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (!en.isIntersecting || seen.has(en.target)) return;
        seen.add(en.target);
        animate(en.target);
        obs.unobserve(en.target);
      });
    }, { threshold: 0.4 });
    els.forEach((el) => obs.observe(el));
  }

  /* Al volver a Inicio los números ya quedan en su valor final, no repetimos la animación */
  function replay() { /* los contadores quedan en su valor final */ }

  return { init, replay };
})();

/* =========================================================
   PROCESO — scroll que cambia la imagen de etapa
   ========================================================= */
const Proc = (function () {
  const list = $('#procList'), img = $('#procImg'), tag = $('#procTag');
  const steps = $$('.step');
  let last = -1;

  function set(i) {
    if (i === last || !steps[i]) return;
    last = i;
    steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
    if (tag) tag.textContent = STAGES[i].t;
    if (img) {
      img.src = STAGES[i].i;
      img.alt = STAGES[i].a;
    }
  }

  function update() {
    if (!list) return;
    const narrow = window.matchMedia('(max-width: 959px)').matches;
    if (narrow) { set(0); return; }
    const vh = window.innerHeight;
    let active = 0, best = Infinity;
    steps.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - vh * 0.45);
      if (d < best) { best = d; active = i; }
    });
    set(active);
  }

  function init() {
    if (!list) return;
    set(0);
    window.addEventListener('scroll', raf(update), { passive: true });
    window.addEventListener('resize', raf(update), { passive: true });
  }

  function refresh() { setTimeout(update, 60); }

  return { init, refresh };
})();

/* =========================================================
   NAV / PROGRESO / IMÁGENES ROTOS
   ========================================================= */
const Chrome = (function () {
  function initBar() {
    const bar = $('#scrollBar');
    if (!bar) return;
    const on = raf(() => {
      const d = document.documentElement;
      const max = (d.scrollHeight - d.clientHeight) || 1;
      bar.style.transform = 'scaleX(' + Math.min(Math.max(d.scrollTop / max, 0), 1) + ')';
    });
    window.addEventListener('scroll', on, { passive: true });
    on();
  }

  function initNav() {
    const nav = $('#nav');
    if (!nav) return;
    const on = raf(() => nav.classList.toggle('is-stuck', window.scrollY > 8));
    window.addEventListener('scroll', on, { passive: true });
    on();
  }

  /* Si una foto no carga, no dejamos un ícono roto: usamos un bloque liso */
  function initImgGuard() {
    document.addEventListener('error', (e) => {
      const t = e.target;
      if (t && t.tagName === 'IMG') {
        t.style.visibility = 'hidden';
        const box = t.parentElement;
        if (box) { box.style.background = 'var(--paper-3)'; box.style.minHeight = '120px'; }
      }
    }, true);
  }

  function initMisc() {
    const y = $('#year');
    if (y) y.textContent = new Date().getFullYear();
    /* Flechas de "ir al proceso" */
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-scroll-next]');
      if (!t) return;
      e.preventDefault();
      const p = $('#proc');
      if (p) p.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    });
  }

  function init() { initBar(); initNav(); initImgGuard(); initMisc(); }
  return { init };
})();

/* =========================================================
   FORMULARIO
   ========================================================= */
const Form = (function () {
  const RULES = {
    nombre:   { t: (v) => v.trim().length > 1,        e: 'e-nombre' },
    telefono: { t: (v) => /^[0-9+ ]{7,15}$/.test(v.trim()), e: 'e-telefono' },
    correo:   { t: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()), e: 'e-correo' },
    mensaje:  { t: (v) => v.trim().length >= 10,       e: 'e-mensaje' }
  };

  function status(kind, text) {
    const box = $('#formSt');
    if (!box) return;
    box.className = 'form__st form__st--' + kind;
    box.textContent = text;
    box.hidden = false;
  }

  function check(name) {
    const r = RULES[name], input = $('#' + name), err = $('#' + r.e);
    if (!input) return true;
    const ok = r.t(input.value);
    input.setAttribute('aria-invalid', String(!ok));
    if (err) err.hidden = ok;
    return ok;
  }

  function init() {
    const form = $('#contactForm');
    if (!form) return;

    Object.keys(RULES).forEach((n) => {
      const i = $('#' + n);
      if (i) i.addEventListener('blur', () => check(n));
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const box = $('#formSt');
      if (box) box.hidden = true;

      const hp = $('#sitio_web');
      if (hp && hp.value) { form.reset(); return; }

      let valid = true, firstBad = null;
      Object.keys(RULES).forEach((n) => {
        if (!check(n)) { valid = false; if (!firstBad) firstBad = n; }
      });

      if (!valid) {
        status('err', 'Revisa los campos marcados.');
        if (firstBad) { const el = $('#' + firstBad); if (el) el.focus(); }
        return;
      }

      const btn = form.querySelector('button[type="submit"]');
      const lbl = btn ? btn.querySelector('.btn__lbl') : null;
      if (lbl) lbl.textContent = 'Enviando…';
      if (btn) btn.disabled = true;

      /* Conecta aquí tu backend: fetch('/api/contacto', {...}) */
      setTimeout(() => {
        if (lbl) lbl.textContent = 'Enviar mensaje';
        if (btn) btn.disabled = false;
        status('ok', 'Mensaje enviado. Un asesor te contactará en menos de 48 horas.');
        form.reset();
        Object.keys(RULES).forEach((n) => {
          const i = $('#' + n);
          if (i) i.removeAttribute('aria-invalid');
        });
      }, 900);
    });
  }

  return { init };
})();

/* =========================================================
   ARRANQUE
   ========================================================= */
document.addEventListener('DOMContentLoaded', function () {
  Index.render('#homeIdx', DATA.slice(0, 4));
  Index.render('#allIdx');
  Chrome.init();
  Drawer.init();
  WA.init();
  Proc.init();
  Form.init();
  Counters.init();
  Reveal.scan();
  Router.init();
});
