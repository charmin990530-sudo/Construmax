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
    let vw = window.innerWidth, vh = window.innerHeight;

    /* Mantiene la vista previa dentro del viewport: si no cabe a la
       derecha del cursor, se voltea al lado izquierdo. */
    function place() {
      const w = box.offsetWidth || 240;
      const h = box.offsetHeight || 320;
      const M = 16, G = 26;
      let nx = tx + G;
      if (nx + w > vw - M) nx = tx - w - G;
      if (nx < M) nx = M;
      let ny = ty - h / 2;
      if (ny < M) ny = M;
      if (ny + h > vh - M) ny = Math.max(M, vh - h - M);
      return [nx, ny];
    }

    /* El bucle solo corre mientras la vista previa está abierta: antes
       seguía pedir frames indefinidamente, incluso sin cursor sobre la
       página, y con la escena eso se nota. */
    function loop() {
      const [ax, ay] = place();
      cx += (ax - cx) * 0.18;
      cy += (ay - cy) * 0.18;
      box.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      rafId = on ? requestAnimationFrame(loop) : 0;
    }
    function start() { if (!rafId) rafId = requestAnimationFrame(loop); }
    function stop() { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } }

    function show(src, name) {
      if (!box) return;
      img.src = src; tag.textContent = name;
      box.hidden = false;
      requestAnimationFrame(() => box.classList.add('is-on'));
      on = true;
      /* Posicionamos de golpe la primera vez para que no entre desde el origen */
      const [ax, ay] = place();
      cx = ax; cy = ay;
      start();
    }
    function hide() {
      if (!box || !on) return;
      on = false;
      stop();
      box.classList.remove('is-on');
      setTimeout(() => { if (!on) box.hidden = true; }, 400);
    }

    if (!coarse) {
      document.addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
      window.addEventListener('resize', () => { vw = window.innerWidth; vh = window.innerHeight; hide(); });
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

  /* Los botones de categoría existían en el HTML, con sus aria-pressed y su
     estado vivo, pero nunca estuvieron conectados: filter() no lo llamaba
     nadie. Aquí se enchufan. */
  function init() {
    $$('.tab').forEach((t) => {
      t.addEventListener('click', () => filter(t.dataset.filter));
    });
  }

  return { render, filter, init, Peek };
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
    document.body.classList.toggle('is-contacto', route.page === 'contacto');
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    const main = $('#contenido');
    if (main) main.focus({ preventScroll: true });

    Reveal.scan();
    if (route.page === 'inicio') { Scrolly.refresh(); Counters.replay(); }
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
   ESCENA DE CONSTRUCCIÓN
   Una sola línea de tiempo maestra (GSAP + ScrollTrigger con
   scrub) gobierna el cielo, la grúa, el terreno, los 56 pisos
   y las luces. Los paneles de texto no se animan con tweens:
   su posición en el flujo ya es la sincronía, y su fundido se
   calcula con aritmética en el mismo onUpdate para no tener
   un segundo trigger por etapa.

   Todo el módulo se apaga solo si no hay GSAP, si el usuario
   pide movimiento reducido o si la escena no está en el DOM.
   ========================================================= */
const Scrolly = (function () {
  /* ---- Configuración. Para cambiar el ritmo o el color, se toca
        solo aquí: SCROLLYTELLING.md documenta cada campo. ---- */
  const CFG = {
    /* Peso de cada etapa en la línea de tiempo. No tienen que sumar 1:
       se normalizan. Estructura y Entrega pesan más porque son las
       etapas que mas construyen. */
    stages: [
      { n: '01', name: 'Terreno',    w: 0.85 },
      { n: '02', name: 'Excavación', w: 1.00 },
      { n: '03', name: 'Cimientos',  w: 1.00 },
      { n: '04', name: 'Estructura', w: 1.55 },
      { n: '05', name: 'Envolvente', w: 1.25 },
      { n: '06', name: 'Acabados',   w: 1.00 },
      { n: '07', name: 'Entrega',    w: 1.35 }
    ],
    /* Cielo: pares [progreso 0-1, color]. Solo se usan los tokens de
       marca, no hay ningún color nuevo en el sistema. */
    sky: [[0, '#F2F0EA'], [0.14, '#E9E6DD'], [0.52, '#E9E6DD'],
          [0.74, '#DCD8CC'], [0.88, '#3B392E'], [1, '#16150F']],
    night: 0.90,   /* a partir de aquí la línea pasa a modo noche */
    steps: 240,    /* granularidad del color del cielo: 240 pasos en toda
                      la escena. Evita repintar el SVG en cada frame. */
    /* Centro de lectura, como fracción de la altura visible. Tiene que
       coincidir con la composición del CSS: en escritorio el panel ocupa
       toda la altura; en móvil deja libre la lámina de arriba. */
    read: { wide: 0.5, narrow: 0.68, bp: 900 }
  };

  const body = $('#sceneBody'), paper = $('.scene__paper'), tw = $('.tw');
  const panels = $$('#scenePanels .panel');
  const bar = $('#sceneBar'), num = $('#stageNum'), name = $('#stageName');
  const chapters = $$('.scene__chapters button');

  let tl = null, mq = null, on = false;
  let ctr = [];        /* centro de cada panel, en fracción del recorrido */
  let tol = [];        /* tolerancia de su fundido */
  let lastSky = -1, lastStage = -1, lastBar = -1, lastNight = null;
  let lastP = [];

  /* ---------- utilidades ---------- */
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const SKY = CFG.sky.map((s) => [s[0], rgb(s[1])]);

  function skyAt(p) {
    for (let i = 1; i < SKY.length; i++) {
      if (p <= SKY[i][0] || i === SKY.length - 1) {
        const a = SKY[i - 1], b = SKY[i];
        const t = clamp((p - a[0]) / (b[0] - a[0] || 1), 0, 1);
        return 'rgb(' + Math.round(a[1][0] + (b[1][0] - a[1][0]) * t) + ',' +
                    Math.round(a[1][1] + (b[1][1] - a[1][1]) * t) + ',' +
                    Math.round(a[1][2] + (b[1][2] - a[1][2]) * t) + ')';
      }
    }
    return SKY[0][1];
  }

  /* Un único escritura de estilo por elemento y por paso: se compara
     contra el valor anterior cuantizado. */
  function quant(v, q) { return Math.round(v * q) / q; }

  /* ---------- construcción de la línea de tiempo ---------- */
  function build() {
    const g = window.gsap;
    const total = CFG.stages.reduce((a, s) => a + s.w, 0);
    /* at[k] = instante normalizado (0-1) en el que arranca la etapa k.
       at[n] = 1 cierra la línea: nada puede pasar de ahí. */
    const at = [];
    let acc = 0;
    CFG.stages.forEach((s) => { at.push(acc / total); acc += s.w; });
    at.push(1);
    const seg = (k, f) => (at[k + 1] - at[k]) * f;

    const E = g.utils.selector(tw);
    /* Los pisos se ordenan por altura para que el encofrado suba como
       una grúa real, torre a torre y no torre por torre. */
    const floors = $$('.fl', tw).sort((a, b) =>
      parseFloat(a.firstElementChild.getAttribute('y')) - parseFloat(b.firstElementChild.getAttribute('y')));
    const glass = $$('.fl__gh', tw);
    const brick = $$('.fl__br', tw);
    const lamps = $$('.fl__w', tw).sort((a, b) => a.dataset.o - b.dataset.o);
    const warm = (el) => el.classList.contains('is-warm');

    tl = g.timeline({
      paused: true,
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.55,
        invalidateOnRefresh: true,
        onRefresh: measure
      }
    });

    /* --- Etapa 01 · Terreno: la lámina se presenta sola --- */
    tl.fromTo(E('.tw-dims'), { opacity: 0 }, { opacity: 1, duration: seg(0, 0.85) }, at[0])
      .fromTo(E('.sk-sun'), { opacity: 0, y: -60 }, { opacity: 0.38, y: 0, duration: seg(0, 1) + seg(1, 1) }, at[0]);

    /* --- Etapa 02 · Excavación --- */
    tl.fromTo(E('.tw-pit'), { opacity: 0 }, { opacity: 1, duration: 0.1 }, at[1])
      .fromTo(E('.tw-pitv'), { scaleY: 0, svgOrigin: '325 542' }, { scaleY: 1, duration: seg(1, 0.6) }, at[1])
      .fromTo(E('.tw-work'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: seg(1, 0.4) }, at[1] + seg(1, 0.15))
      .to(E('.wk-m'), { opacity: 0.55, duration: 0.15, stagger: 0.02 }, at[1] + seg(1, 0.4));

    /* --- Etapa 03 · Cimientos: acero, encofrado y placa --- */
    tl.fromTo(E('.tw-rebar'), { opacity: 0 }, { opacity: 1, duration: seg(2, 0.35), stagger: 0.012 }, at[2])
      .fromTo(E('.tw-found'), { opacity: 0 }, { opacity: 1, duration: 0.15 }, at[2] + seg(2, 0.15))
      .fromTo(E('.tw-fstem'), { scaleY: 0, svgOrigin: '335 610' }, { scaleY: 1, duration: seg(2, 0.45) }, at[2] + seg(2, 0.2))
      .fromTo(E('.tw-fslab'), { scaleX: 0, svgOrigin: '313 540' }, { scaleX: 1, duration: seg(2, 0.45) }, at[2] + seg(2, 0.45));

    /* --- Etapa 04 · Estructura: la grúa llega y los pisos suben --- */
    const g3 = seg(3, 0.75);                      /* Margen para la grúa */
    tl.fromTo(E('.tw-crane'), { opacity: 0 }, { opacity: 1, duration: 0.1 }, at[3])
      .fromTo(E('.cn-mast'), { scaleY: 0, svgOrigin: '706 540' }, { scaleY: 1, duration: g3 * 0.4 }, at[3] + 0.02)
      .fromTo(floors, { opacity: 0, y: 5 },
        { opacity: 1, y: 0, duration: 0.06, stagger: { each: g3 / floors.length } }, at[3] + g3 * 0.18)
      .fromTo(E('.cn-jib'), { rotation: -9, svgOrigin: '706 196' },
        { rotation: 7, duration: g3, ease: 'sine.inOut', yoyo: true, repeat: 1 }, at[3] + 0.02)
      .fromTo(E('.cn-hook'), { y: 0 },
        { y: -46, duration: g3 / 2, ease: 'sine.inOut', yoyo: true, repeat: 1 }, at[3] + 0.04)
      .to(E('.tw-work'), { opacity: 0, duration: 0.15 }, at[3]);

    /* --- Etapa 05 · Envolvente: ladrillo, vidrio y andamios --- */
    const g4 = seg(4, 0.8);
    tl.fromTo(brick, { opacity: 0 }, { opacity: 1, duration: 0.06, stagger: { each: g4 / brick.length } }, at[4])
      .fromTo(glass, { opacity: 0 }, { opacity: 1, duration: 0.06, stagger: { each: g4 / glass.length } }, at[4])
      .fromTo(lamps, { opacity: 0 }, { opacity: (i, el) => (warm(el) ? 0.1 : 0.08), duration: 0.05,
        stagger: { each: g4 / lamps.length } }, at[4])
      .fromTo(E('.tw-scaf'), { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.25 }, at[4] + seg(4, 0.1));

    /* --- Etapa 06 · Acabados: se desmonta el andamio, se corona la obra --- */
    tl.to(E('.tw-scaf'), { opacity: 0, x: 12, duration: seg(5, 0.3) }, at[5])
      .to(E('.cn-load'), { opacity: 0, duration: 0.1 }, at[5])
      .fromTo(E('.tw-crown'), { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: seg(5, 0.5) }, at[5] + seg(5, 0.15))
      .to(E('.cn-mast'), { scaleY: 0.35, svgOrigin: '706 540', duration: seg(5, 0.55) }, at[5] + seg(5, 0.35));

    /* --- Etapa 07 · Entrega: atardecer, luces y apagado de obra --- */
    const g6 = seg(6, 1);
    tl.to(E('.tw-crane'), { opacity: 0, duration: g6 * 0.2 }, at[6] + g6 * 0.05)
      .to(E('.sk-sun'), { y: 300, opacity: 0, duration: g6 * 0.75 }, at[6] - g6 * 0.1)
      .fromTo(E('.sk-band'), { scaleY: 0.2, opacity: 0 },
        { scaleY: 1, opacity: 0.9, duration: g6 * 0.3, yoyo: true, repeat: 1 }, at[6] - g6 * 0.05)
      .to(lamps, { opacity: (i, el) => (warm(el) ? 0.95 : 0.9), duration: 0.05,
        stagger: { each: g6 * 0.55 / lamps.length } }, at[6] - g6 * 0.05)
      .to(E('.ct-b'), { opacity: 0.13, duration: g6 * 0.4 }, at[6]);

    /* Parallax: el fondo y las nubes se mueven distinto al primer plano */
    tl.fromTo(E('.tw-city'), { y: -6 }, { y: 12, duration: 1 }, 0)
      .fromTo(E('.cl'), { x: 0 }, { x: (i, el) => -46 * Number(el.dataset.d), duration: 1 }, 0);

    /* Cierra la línea en 1 para que tl.progress() sea directamente el
       progreso del scroll, sin tener que normalizar a mano. */
    tl.set(E('.tw-dims'), { opacity: 1 }, 1);

    /* El pintado va en el onUpdate de la línea de tiempo, no en el del
       trigger: con scrub el trigger solo se dispara al mover el scroll,
       y el contador se quedaría congelado mientras la escena alcanza su
       posición. El tween de scrub sí avisa en cada paso, incluida la
       puesta al día final. */
    tl.eventCallback('onUpdate', paint);

    return at;
  }

  /* Posición de cada panel dentro del recorrido, en fracción del alto
     total de la escena. Se recalcula en cada refresh (resize, cambio de
     ruta, giro de pantalla). Con esto el fundido de un panel depende
     solo de cuán lejos está su centro de la línea de lectura: al
     empezar y al terminar la escena el primer y el último panel salen
     totalmente opacos, sin trucos. */
  function measure() {
    if (!body) return;
    const A = Math.max(body.offsetHeight, 1);
    const top = body.getBoundingClientRect().top;
    ctr = panels.map((p) => {
      const r = p.getBoundingClientRect();
      return { c: ((r.top - top) + r.height / 2) / A, h: r.height / A };
    });
    tol = ctr.map((c) => c.h * 0.5 + 0.05);
  }

  /* Un solo paso por frame: cielo, paneles, contador y barra. */
  function paint() {
    const p = tl ? tl.progress() : 0;
    const A = Math.max(body.offsetHeight, 1);
    const V = window.innerHeight;
    const span = Math.max(A - V, 1);
    const vc = (p * span + V * (window.innerWidth >= CFG.read.bp ? CFG.read.wide : CFG.read.narrow)) / A;

    /* Cielo: 240 pasos en toda la escena, no 60 escrituras por segundo */
    const q = Math.round(p * CFG.steps);
    if (q !== lastSky) {
      lastSky = q;
      paper.style.setProperty('--sky', skyAt(q / CFG.steps));
    }

    /* La línea pasa a modo noche una sola vez: a partir de ahí el CSS
       lleva la tinta del edificio de oscuro a claro con su transición. */
    if (lastNight === null || p >= CFG.night !== lastNight) {
      lastNight = p >= CFG.night;
      setNight(lastNight);
    }

    /* Paneles: entrada y salida con aritmética, sin tweens ni triggers.
       El contador de etapa sale de aquí y no de los pesos del timeline:
       así el rótulo "Etapa 04" y el panel que se está leyendo siempre
       coinciden, aunque se cambien las alturas o los pesos. */
    let best = 0, bestD = Infinity;
    for (let i = 0; i < panels.length; i++) {
      if (!ctr[i]) continue;
      const e = ctr[i].c - vc;                       /* >0: el panel aún no ha llegado */
      if (Math.abs(e) < bestD) { bestD = Math.abs(e); best = i; }
      const f = clamp(1 - Math.abs(e) / tol[i], 0, 1);
      const o = quant(f * f * (3 - 2 * f), 200);    /* smoothstep: sin cortes */
      const y = quant(clamp(e, -1.4, 1.4) * 90, 24);
      if (lastP[i] === o && lastP[i + 1] === y) continue;
      lastP[i] = o; lastP[i + 1] = y;
      panels[i].style.opacity = o;
      panels[i].style.transform = 'translate3d(0,' + y.toFixed(2) + 'px,0)';
    }

    /* Contador de etapa: el panel que está en la línea de lectura */
    if (best !== lastStage) {
      lastStage = best;
      const st = CFG.stages[best];
      if (num) num.textContent = st.n;
      if (name) name.textContent = st.name;
      chapters.forEach((b, i) => {
        if (i === best) b.setAttribute('aria-current', 'true');
        else b.removeAttribute('aria-current');
      });
    }

    /* Barra de avance de la escena */
    const b = Math.round(p * 200);
    if (b !== lastBar) {
      lastBar = b;
      if (bar) bar.style.transform = 'scaleX(' + (b / 200).toFixed(3) + ')';
    }
  }

  function setNight(on) {
    if (tw) tw.classList.toggle('is-night', on);
  }

  function start() {
    if (on || !body || !tw) return;
    if (!window.gsap || !window.ScrollTrigger) return;   /* sin GSAP: lámina estática */
    window.gsap.registerPlugin(window.ScrollTrigger);
    window.ScrollTrigger.config({ ignoreMobileResize: true });
    build();
    setNight(false);
    measure();
    on = true;
    document.documentElement.classList.add('st-ready');
  }

  function stop() {
    if (!on) return;
    if (tl) { tl.scrollTrigger.kill(); tl.kill(); tl = null; }
    on = false;
    panels.forEach((p) => { p.style.opacity = ''; p.style.transform = ''; });
    document.documentElement.classList.remove('st-ready');
    if (paper) paper.style.removeProperty('--sky');
    setNight(true);
    lastSky = lastStage = lastBar = -1; lastP = [];
  }

  /* Si la preferencia de movimiento cambia con la página abierta, la
     escena se desarma sin recargar. */
  function watchMotion() {
    if (!window.matchMedia) return;
    mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      const d = document.documentElement;
      if (mq.matches) { d.classList.remove('st'); stop(); }
      else { d.classList.add('st'); start(); }
    };
    if (mq.addEventListener) mq.addEventListener('change', apply);
  }

  function bindChapters() {
    chapters.forEach((b) => {
      b.addEventListener('click', () => {
        const p = panels[Number(b.dataset.go)];
        if (!p) return;
        p.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      });
    });
  }

  function init() {
    if (!body || !panels.length) return;
    bindChapters();
    watchMotion();
    const d = document.documentElement;
    if (!mq || !mq.matches) { d.classList.add('st'); start(); }
    else setNight(true);
    window.addEventListener('orientationchange', () => {
      setTimeout(() => { if (on) measure(); }, 260);
    });
  }

  function refresh() { if (on) window.ScrollTrigger.refresh(); }

  return { init, refresh, on: () => on };
})();

/* =========================================================
   NAV / PROGRESO / IMÁGENES ROTOS
   ========================================================= */
const Chrome = (function () {
  /* El alto del documento se cachea: leerlo en cada frame obligaba al
     navegador a recalcular la página entera, y con la escena el documento
     mide siete pantallas más que antes. */
  function initBar() {
    const bar = $('#scrollBar');
    if (!bar) return;
    let max = 0;
    const measure = () => {
      const d = document.documentElement;
      max = (d.scrollHeight - d.clientHeight) || 1;
    };
    const on = raf(() => {
      const d = document.documentElement;
      bar.style.transform = 'scaleX(' + Math.min(Math.max(d.scrollTop / max, 0), 1) + ')';
    });
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', raf(() => { measure(); on(); }), { passive: true });
    measure();
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
  Index.init();
  Chrome.init();
  Drawer.init();
  WA.init();
  Form.init();
  Scrolly.init();
  Counters.init();
  Reveal.scan();
  Router.init();
});
