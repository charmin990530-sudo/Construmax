/* =========================================================
   CONSTRUMAX — Escena 3D de la portada
   La Torre Chapinero Alto levantándose sola, con grúa.

   Es un motor 3D propio sobre <canvas> 2D. No hay WebGL ni Three.js
   a propósito, por tres razones que pesan más que el aspecto de
   plantilla:

   · El sistema visual del sitio es plano y de líneas: papel, tinta y
     un rojo de plano. Un render PBR con HDRI y bloom se leería
     pegado encima de la página. Con líneas de 1 px el 3D nace
     hablando el mismo idioma que la lámina SVG de más abajo.
   · Un canvas 2D con doscientas primitivas va sobrado a 60 fps y no
     depende de la GPU: en un móvil viejo cae al rasterizador por
     software y sigue dibujando igual.
   · Cero dependencias, cero build, funciona con doble clic.

   Lo que hay dentro:
     · perspectiva con órbita (azimut y cabeceo) e inercia
     · orden del pintor con descarte de caras traseras
     · malla de losas, podio, entorno urbano, grúa reticulada y andamio
     · cotas de nivel y línea de cota, como en un plano
     · construcción cronometrada: el gancho baja, sube con la losa
       encima y la deja en su piso; al final se encienden las ventanas
     · clic sobre un piso: lo selecciona, lo marca en rojo de plano y
       lee su cota
     · sin ratón no hay escena: todo se hace con teclado, y con menos
       movimiento se congela en un fotograma

   El hero tiene debajo la foto de siempre, como póster. El canvas
   solo se revela cuando ya hay un fotograma dibujado encima, así que
   sin JavaScript, sin canvas, con menos movimiento o si algo falla,
   lo que se ve es exactamente lo que se veía antes: la foto.
   ========================================================= */
(function () {
'use strict';

const TAU = Math.PI * 2;
const cos = Math.cos, sin = Math.sin, min = Math.min, max = Math.max, abs = Math.abs;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const pad2 = (n) => String(n).padStart(2, '0');

/* ------------------------------------------------------------
   1. CONFIGURACIÓN
   Una unidad del mundo es un metro. Todo lo demás sale de aquí.
   ------------------------------------------------------------ */
const CFG = {
  floors: 24,
  fh: 3.6,                  /* altura de piso */
  slab: 0.5,                /* canto de la losa */
  tower: 22,                /* lado de la planta */
  podium: { w: 34, d: 28, h: 7.2 },
  crane: { x: 22, z: 5, h: 74, jib: 44, cjib: 14, half: 1.8, apex: 9 },
  ty: 34,                  /* altura del punto que orbita la cámara */

  /* Se levantan ya hechas: la grúa trabaja arriba del todo, que es
     lo que se ve en una obra real, y el visitante encuentra una torre
     en pie en lugar de un solar vacío. */
  prebuilt: 9,
  perFloor: 1.15,           /* segundos por piso */

  /* A qué puntos va la grúa a buscar cada losa. Alternar varios es lo
     que hace que se lea como una grúa de obra y no como un brazo que
     sube y baja siempre en la misma vertical. */
  slew: [0, 0.34, -0.30, 0.17, -0.13, 0.07],

  orbit: { minAz: -1.5, maxAz: 1.5, minEl: 0.05, maxEl: 0.85 },
  /* Encuadre. La lámina tiene que caber entera y su proporción cambia
     con el formato, así que la cámara no se pone a ojo: se deriva del
     tamaño del lienzo. Estas medidas son el mundo que tiene que verse,
     en metros, ytaken del lienzo sale la distancia.

     · x: de -58 (las cifras de las cotas) a +42 (la grúa).
     · y: de -12 (el suelo por debajo de la calle) a +96 (la coronación).
     · margen: el 8 % de aire alrededor, para que nada roce el borde. */
  fit: { x0: -56, x1: 44, y0: -8, y1: 96 },
  /* La franja de abajo la ocupa la cartela: el dibujo nunca entra ahí. */
  cartela: 52,
  levels: [0, 12, 20, 24]   /* cotas que se rotulan */
};

/* ------------------------------------------------------------
   2. DOM
   ------------------------------------------------------------ */
const root = document.getElementById('heroStage');
const canvas = document.getElementById('stage');
if (!root || !canvas) return;
const ctx = canvas.getContext && canvas.getContext('2d');
if (!ctx) return;                       /* sin canvas 2D: póster */

const elLive   = document.getElementById('stageLive');
const elRead   = root.querySelector('[data-stage-read]');
const elBar    = root.querySelector('[data-stage-bar]');
const elPlay   = root.querySelector('[data-stage-play]');

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------
   3. PALETA — leída de los tokens, no escrita aquí
   ------------------------------------------------------------ */
const scratch = document.createElement('canvas').getContext('2d');
function norm(c) {
  /* El navegador normaliza cualquier color CSS al leerlo en un
     contexto de canvas: así no hay que escribir un parser de color
     para poder applying alpha. */
  scratch.fillStyle = '#000000';
  scratch.fillStyle = c;
  return scratch.fillStyle;
}
/* rgba() con caché. Esta función se llama una vez por primitiva y por
   frame —unas quinientas—, y antes de la caché eso eran quinientas
   cadenas nuevas y quinientos parseos de color en cada frame. En
   móvil con la CPU limitada ×4 eso se notaba: la escena comía el
   presupuesto y el resto del scroll iba a 33 ms.
   Las opacidades del código son literales, así que la caché tiene
   unas pocas entradas y no crece. Se vacía al cambiar de tema. */
const rgbaCache = new Map();
function rgba(color, a) {
  /* El alfa global del fundido se multiplica aqui en vez de en el
     bucle de pintado, y se acota a 32 pasos. El motivo es el coste:
     sin cachear serian unas 600 cadenas nuevas por segundo solo del
     fundido, y la cache de rgba es justamente lo que se puso para
     evitar eso. A partir de 32 pasos el alfa ya esta opaco y el
     redondeo es invisible. */
  const f = max(0, min(1, a * fade)) * 32 | 0;
  const k = color + '|' + f;
  let v = rgbaCache.get(k);
  if (v !== undefined) return v;
  const h = norm(color);
  if (h.charAt(0) !== '#') { rgbaCache.set(k, h); return h; }
  v = 'rgba(' + parseInt(h.slice(1, 3), 16) + ',' + parseInt(h.slice(3, 5), 16) +
      ',' + parseInt(h.slice(5, 7), 16) + ',' + (f / 32).toFixed(3) + ')';
  rgbaCache.set(k, v);
  return v;
}
const P = {};
function readPalette() {
  /* Ojo: getPropertyValue no se puede sacar del objeto al que pertenece.
     Separado de su receptor lanza Illegal invocation. */
  const cs = getComputedStyle(document.documentElement);
  const g = (n) => cs.getPropertyValue(n).trim();
  P.ink = norm(g('--ink') || '#16150F');
  P.ink3 = norm(g('--ink-3') || '#6C6858');
  P.accent = norm(g('--accent') || '#C23709');
  rgbaCache.clear();
}
readPalette();

/* ------------------------------------------------------------
   4. CÁMARA
   ------------------------------------------------------------ */
const cam = { az: -0.62, el: 0.28, dist: 270, f: 1000, ty: CFG.ty };
let W = 0, H = 0, dpr = 1, shift = 0.5;
/* Dónde cae el origen en pantalla, en fracción del alto.
   VX era el desplazamiento horizontal y no se usa: el reparto se
   hace con `shift`, que además depende del ancho. */
let VY = 0.62;

/* Mundo -> espacio de cámara. La cámara orbita un punto a ty de alto. */
function toCam(x, y, z) {
  y -= cam.ty;
  const ca = cos(cam.az), sa = sin(cam.az);
  const rx = x * ca + z * sa;
  let rz = -x * sa + z * ca;
  const ce = cos(cam.el), se = sin(cam.el);
  const ry = y * ce + rz * se;
  rz = -y * se + rz * ce;
  return [rx, ry, rz + cam.dist];
}
/* Espacio de cámara -> pantalla. Devuelve además la profundidad. */
function screen(c) {
  const s = cam.f / max(c[2], 1);
  return [W * shift + c[0] * s, H * VY - c[1] * s, c[2]];
}
const at = (x, y, z) => screen(toCam(x, y, z));

/* ------------------------------------------------------------
   5. PRIMITIVAS
   Todo son cuadriláteros y segmentos en espacio de cámara. Se ordenan
   por profundidad y se pintan de lejos a cerca: el orden del pintor.
   Sin z-buffer, pero con descarte de caras traseras, que para una
   escena de líneas es exactamente lo que hace falta.
   ------------------------------------------------------------ */
const prims = [];
const F = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];

function quad(a, b, c, d, st) {
  const q = [toCam(a[0], a[1], a[2]), toCam(b[0], b[1], b[2]),
             toCam(c[0], c[1], c[2]), toCam(d[0], d[1], d[2])];
  const ux = q[1][0] - q[0][0], uy = q[1][1] - q[0][1], uz = q[1][2] - q[0][2];
  const vx = q[2][0] - q[0][0], vy = q[2][1] - q[0][1], vz = q[2][2] - q[0][2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  /* La cámara está en el origen del espacio de cámara: si la normal
     mira hacia el lado opuesto al origen, la cara está de espaldas. */
  if (nx * q[0][0] + ny * q[0][1] + nz * q[0][2] > 0) return;
  prims.push({ k: 0, z: (q[0][2] + q[1][2] + q[2][2] + q[3][2]) / 4, q: q, st: st });
}
function seg(x0, y0, z0, x1, y1, z1, st) {
  const a = toCam(x0, y0, z0), b = toCam(x1, y1, z1);
  prims.push({ k: 1, z: (a[2] + b[2]) / 2, a: a, b: b, st: st });
}
function label(x, y, z, str, st) {
  prims.push({ k: 2, z: toCam(x, y, z)[2], p: toCam(x, y, z), str: str, st: st });
}
/* Caja completa: seis caras. Devuelve los ocho vértices por si hay que
   seguir una arista suelta después. */
function box(cx, cy, cz, w, h, d, st, faces) {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  const z0 = cz - d / 2, z1 = cz + d / 2;
  const v = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
             [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
  if (faces) for (let i = 0; i < 6; i++) quad(v[F[i][0]], v[F[i][1]], v[F[i][2]], v[F[i][3]], st);
  return v;
}
/* Anillo horizontal: los cuatro cantos de un rectángulo. */
function ring(cx, y, cz, w, d, st) {
  const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2;
  seg(x0, y, z0, x1, y, z0, st); seg(x1, y, z0, x1, y, z1, st);
  seg(x1, y, z1, x0, y, z1, st); seg(x0, y, z1, x0, y, z0, st);
}

/* ------------------------------------------------------------
   6. EL RELOJ DE LA OBRA
   Un ciclo por piso. El gancho baja vacío, se posa, sube con la losa
   encima, la suelta y se retira mientras la grúa se coloca para la
   siguiente. Todo lo que se mueve se lee de aquí.
   ------------------------------------------------------------ */
const work = { built: CFG.prebuilt, phase: 0, kind: 'obra', total: 0, done: false };
const lamps = new Float32Array(CFG.floors);
const crane = { yaw: CFG.slew[0], hx: 0, hz: 0, hookY: 0, carry: false, trolley: 28 };

function tick(dt) {
  const cyc = CFG.perFloor;
  work.total = cyc * (CFG.floors - CFG.prebuilt);
  if (clock < work.total) {
    work.built = CFG.prebuilt + clock / cyc;
    work.phase = (clock % cyc) / cyc;
    work.kind = 'obra';
    work.done = false;
  } else {
    work.built = CFG.floors;
    work.phase = 0;
    work.kind = 'listo';
    work.done = true;
  }
}

function stepCrane(dt) {
  const c = CFG.crane;
  const next = work.kind === 'obra'
    ? min(CFG.floors - 1, Math.floor(work.built))
    : CFG.floors - 1;
  const goal = work.kind === 'obra'
    ? CFG.slew[next % CFG.slew.length]
    : sin(clock * 0.26) * 0.15;
  /* La grúa pesa: no gira de golpe, persigue su sitio. */
  crane.yaw += (goal - crane.yaw) * min(1, dt * 1.6);

  crane.trolley = 28;
  const hx0 = -crane.trolley;
  crane.hx = c.x + hx0 * cos(crane.yaw);
  crane.hz = c.z + hx0 * sin(crane.yaw);

  const top = c.h + 1.2, rest = top - 6;
  crane.carry = false;
  if (work.kind === 'obra') {
    const fy = CFG.podium.h + Math.floor(work.built) * CFG.fh;
    const p = work.phase;
    if (p < 0.16) crane.hookY = rest;
    else if (p < 0.34) crane.hookY = lerp(rest, fy - 1.4, smooth((p - 0.16) / 0.18));
    else if (p < 0.52) { crane.hookY = lerp(fy - 1.4, fy + 0.3, smooth((p - 0.34) / 0.18)); crane.carry = true; }
    else crane.hookY = lerp(fy + 0.3, rest, smooth((p - 0.52) / 0.48));
  } else {
    crane.hookY = rest - (sin(clock * 1.05) * 0.5 + 0.5) * 20;
  }
}

/* ------------------------------------------------------------
   7. LA ESCENA
   ------------------------------------------------------------ */
const st = {
  /* faint: trazo tenue pero de TINTA, no de gris. Con el gris de marca
     (--ink-3) una línea al 26 % quedaba en 1,35:1 sobre el papel: no se
     veía. Con tinta al mismo alfa, 1,75:1. Medido sobre el lienzo real,
     no a ojo. */
  faint:  function (a) { return { w: 1, c: P.ink, a: a }; },
  hair:   function (a) { return { w: 1, c: P.ink,  a: a }; },
  heavy:  function (a) { return { w: 1.4, c: P.ink, a: a }; },
  red:    function (a, w) { return { w: w || 1.5, c: P.accent, a: a, accent: true }; }
};

function ground() {
  /* Radio corto a propósito: la retícula tiene que quedarse en el
     tercio derecho, junto al edificio. Si llega a media página se
     come la columna del titular. */
  const R = 92, n = 8;
  for (let i = -n; i <= n; i++) {
    const o = i * (R / n), major = i % 5 === 0;
    const s = st.faint(major ? 0.40 : 0.26);
    seg(-R, 0, o, R, 0, o, s);
    seg(o, 0, -R, o, 0, R, s);
  }
}

function city() {
  /* El barrio que rodea la obra. Tres decisiones y ninguna es libre:
     · cerca. La cámara orbita el ORIGIN a cam.dist metros, así que
       "lejos" significa dentro del cilindro de visión, no un radio
       grande: a 150 m quedaban delante del observador y se leían como
       cajas gigantes flotando sobre el titular.
     · bajos. Si miden lo mismo que la torre dejan de ser contexto y
       compiten con ella.
     · con relleno muy tenue. Un alambrado vacío se lee como embalaje;
       una mancha pálida se lee como ciudad.
     Su trabajo es dar escala: para que 24 pisos signifiquen algo. */
  const rnd = (i2) => (Math.sin(i2 * 12.9898) * 43758.5453 % 1 + 1) % 1;
  for (let k = 0; k < 14; k++) {
    const a = k / 14 * TAU + 0.31;
    const rad = 27 + rnd(k) * 31;
    const bx = cos(a) * rad, bz = sin(a) * rad;
    const w = 9 + rnd(k + 3) * 13, d = 8 + rnd(k + 5) * 11;
    const h = 4 + rnd(k + 7) * 9;
    /* Solo aristas, sin relleno. Cuatro verticales y el anillo de
       coronación dan la misma escala que una caja rellena y cuestan
       una fracción: el relleno de 84 cuadriláteros por frame era de
       lo más caro de la escena. */
    const st2 = { w: 1, c: P.ink, a: 0.28 };
    const x0 = bx - w / 2, x1 = bx + w / 2, z0 = bz - d / 2, z1 = bz + d / 2;
    seg(x0, 0, z0, x0, h, z0, st2); seg(x1, 0, z0, x1, h, z0, st2);
    seg(x0, 0, z1, x0, h, z1, st2); seg(x1, 0, z1, x1, h, z1, st2);
    ring(bx, h, bz, w, d, st2);
  }
}

function podium() {
  const p = CFG.podium;
  box(0, p.h / 2, 0, p.w, p.h, p.d, { w: 1, c: P.ink, a: 0.42, fill: rgba(P.ink, 0.06) }, true);
  ring(0, p.h, 0, p.w, p.d, st.hair(0.36));
  /* Losas de la losa de cimentación, insinuadas bajo el podio. */
  ring(0, 0.35, 0, p.w * 0.78, p.d * 0.78, st.faint(0.34));
  ring(0, 0.9, 0, p.w * 0.5, p.d * 0.5, st.faint(0.30));
}

function floorTop(i) { return CFG.podium.h + (i + 1) * CFG.fh; }

/* Pilares y núcleo.
   Una torre de hormigón armado no es una pila de losas: son losas Y
   columnas. Sin las columnas el dibujo se lee como una pila de
   tortitas, y con ellas ya se lee como un edificio en obra. El núcleo
   de escaleras y ascensores va en el centro, como en cualquier plano. */
function frame(inBuild) {
  const half = CFG.tower / 2 - 0.7;
  const y0 = CFG.podium.h;
  const y1 = y0 + inBuild * CFG.fh;
  if (inBuild < 1) return;
  const s = st.hair(0.34);
  const c = [[-half, -half], [half, -half], [half, half], [-half, half]];
  for (let k = 0; k < 4; k++) seg(c[k][0], y0, c[k][1], c[k][0], y1, c[k][1], s);

  /* Refuerzo del fuste: tres bandas horizontales para que la columna
     no se lea como un pelo suelto. */
  for (let i = 0; i < inBuild; i++) {
    if (i % 4) continue;
    ring(0, y0 + i * CFG.fh + CFG.slab, 0, CFG.tower - 0.6, CFG.tower - 0.6, st.faint(0.30));
  }

  /* Núcleo de circulação */
  const n = 3.4, t = st.hair(0.3);
  const k = [[-n, -n], [n, -n], [n, n], [-n, n]];
  for (let i = 0; i < 4; i++) seg(k[i][0], y0, k[i][1], k[i][0], y1, k[i][1], t);
}

function tower() {
  const h = CFG.tower, half = h / 2;
  const inBuild = Math.floor(work.built);

  frame(inBuild);

  /* Solo los pisos ya levantados. La losa siguiente no existe hasta
     que el gancho la sube: es el momento en que se ve crecer. */
  for (let i = 0; i < inBuild; i++) {
    const y = CFG.podium.h + i * CFG.fh;
    const on = sel === i, hov = hover === i;

    let s;
    if (on) s = { w: 1.6, c: P.accent, a: 0.95, fill: rgba(P.accent, 0.1), accent: true };
    else if (hov) s = { w: 1.4, c: P.ink, a: 0.8, fill: rgba(P.ink, 0.07) };
    else s = { w: 1.1, c: P.ink, a: 0.5, fill: rgba(P.ink, 0.045) };

    box(0, y + CFG.slab / 2, 0, h, CFG.slab, h, s, true);

    const k = lamps[i];
    if (k > 0.02) {
      const zf = half + 0.02;
      for (let c = 0; c < 3; c++) {
        const x = -half + 3.4 + c * 5.2;
        /* Una de cada siete vanos queda en rojo de plano: es la misma
           idea que las ventanas encendidas de la lámina SVG. */
        const warm = ((i * 3 + c) % 7) < 2;
        seg(x - 1.7, y + CFG.fh * 0.66, zf, x + 1.7, y + CFG.fh * 0.66, zf,
          { w: 2, c: warm ? P.accent : P.ink, a: (warm ? 0.5 : 0.26) * k });
      }
    }
  }
}

function scaffold() {
  /* Andamio: solo los tres pisos de arriba, que es donde hay obra,
     y muy discreto. Con más plantas se convertía en una caja
     translúcida alrededor de la torre y tapaba justo lo que había que
     enseñar: que se está levantando. Su trabajo es decir "aquí arriba
     se está trabajando", no existir. */
  if (work.done || work.built >= CFG.floors) return;   /* obra terminada: se desmonta */
  const half = CFG.tower / 2 + 1.3;
  const y0 = CFG.podium.h + Math.floor(work.built) * CFG.fh;
  const y1 = min(y0 + CFG.fh * 2, floorTop(CFG.floors));
  const post = st.faint(0.34), tie = st.faint(0.30);
  const cs = [[-half, -half], [half, -half], [half, half], [-half, half]];
  /* Montantes y, en cada nivel, el travesaño de la plataforma. Sin los
     travesaños el andamio era una caja de alambre suelta alrededor de
     la torre, que es justo lo que tapaba. */
  for (let k = 0; k < 4; k++) seg(cs[k][0], y0, cs[k][1], cs[k][0], y1, cs[k][1], post);
  for (let y = y0 + CFG.fh; y <= y1 + 0.01; y += CFG.fh) ring(0, y, 0, half * 2, half * 2, tie);
}

function craneMesh() {
  const c = CFG.crane, hl = c.half, yaw = crane.yaw;
  const heavy = st.heavy(0.62), thin = st.hair(0.3);
  const X = c.x, Z = c.z, apex = c.h + c.apex;
  /* Gira un punto del plano de la grúa alrededor del mástil. */
  const rot = (dx, dz) => [X + dx * cos(yaw) - dz * sin(yaw), Z + dx * sin(yaw) + dz * cos(yaw)];

  /* Mástil reticulado: cuatro montantes, travesaños y cruces. Sin
     relleno: es una celosía y tiene que verse a través. */
  const cs = [[-hl, -hl], [hl, -hl], [hl, hl], [-hl, hl]];
  for (let k = 0; k < 4; k++) seg(X + cs[k][0], 0, Z + cs[k][1], X + cs[k][0], c.h, Z + cs[k][1], heavy);
  for (let y = 7.5; y <= c.h; y += 7.5) {
    for (let k = 0; k < 4; k++) {
      const a = cs[k], b = cs[(k + 1) % 4];
      seg(X + a[0], y, Z + a[1], X + b[0], y, Z + b[1], heavy);
      seg(X + a[0], y - 7.5, Z + a[1], X + b[0], y, Z + b[1], thin);
    }
  }
  seg(X, c.h, Z, X, apex, Z, heavy);

  /* Pluma: dos cordones y celosía, con tirantes al pico. */
  const up = c.h + 1.2, dep = 1.7;
  for (let d = 6; d <= c.jib; d += 6) {
    const w = hl * (1 - (d / c.jib) * 0.75);
    const a = rot(-d, -w), b = rot(-d, w);
    seg(a[0], up, a[1], b[0], up, b[1], heavy);
    seg(a[0], up - dep, a[1], b[0], up - dep, b[1], heavy);
    seg(a[0], up, a[1], b[0], up - dep, b[1], thin);
    if (d % 8 === 4) { seg(a[0], up, a[1], X, apex, Z, thin); seg(b[0], up, b[1], X, apex, Z, thin); }
  }
  /* Contrapeso */
  for (let d = 3; d <= c.cjib; d += 6) {
    const a = rot(d, -hl), b = rot(d, hl);
    seg(a[0], up, a[1], b[0], up, b[1], heavy);
    seg(a[0], up - dep, a[1], b[0], up - dep, b[1], heavy);
    seg(a[0], up, a[1], b[0], up - dep, b[1], thin);
  }
  const cw = rot(c.cjib - 2, 0);
  box(cw[0], up - dep / 2 - 1.6, cw[1], 6, 3.2, 4, { w: 1.3, c: P.ink, a: 0.5, fill: rgba(P.ink, 0.35) }, true);

  /* Cabina de operación */
  const cab = rot(-2.5, hl + 1.6);
  box(cab[0], up - 1, cab[1], 3, 2.4, 2.4, { w: 1.3, c: P.ink, a: 0.55, fill: rgba(P.ink, 0.32) }, true);

  /* Plomada, cable y gancho. El gancho va en rojo de plano: es el
     único acento en movimiento y por eso se le ve desde lejos. */
  const tro = rot(-crane.trolley, 0);
  box(tro[0], up + 0.7, tro[1], 2.6, 1.3, 2.4, { w: 1.2, c: P.ink, a: 0.6, fill: rgba(P.ink, 0.4) }, true);
  seg(tro[0], up, tro[1], tro[0], crane.hookY, tro[1], st.hair(0.5));
  box(tro[0], crane.hookY, tro[1], 2.8, 1.5, 2.4,
    { w: 1.5, c: P.accent, a: 0.85, fill: rgba(P.accent, 0.3), accent: true }, true);

  /* La losa que sube con el gancho. */
  if (crane.carry) {
    box(tro[0], crane.hookY - 1.5, tro[1], CFG.tower, CFG.slab, CFG.tower,
      { w: 1.6, c: P.accent, a: 0.9, fill: rgba(P.accent, 0.2), accent: true }, true);
  }
}

function dims() {
  /* Cotas de nivel a la izquierda, que es el aire que deja el titular.
     Es lo que convierte un dibujo en algo que parece un plano:
     una línea de cota con sus dos extremos, la abandonoía que la
     une al edificio, y la cifra al lado.

     El nivel superior (+93.1) era el que se salía del lienzo, y se
     salía POR ARRIBA: en lienzos de 398 px de alto la etiqueta caía
     en y = -24, fuera del canvas. No por la izquierda —el hueco de
     la torre es generoso incluso en móvil—, sino por arriba, porque
     la cámara se acerca menos y la torre se sale del encuadre
     vertical. Por eso el corte mira los dos ejes y no solo el ancho.

     En vez de un ancho de lienzo inventado se mide el texto de verdad
     (measureText) y se proyecta el punto real, así que el resultado
     depende de la fuente que se haya cargado y de dónde esté la
     cámara, no de una constante que hay que mantener a mano. */
  const edge = -CFG.tower / 2;
  const lx = edge - 13;
  const levels = CFG.levels.slice().sort((a, b) => a - b);

  /* ¿Cabe esta cota? Margen de 4 px para que el texto no rozase el borde. */
  const pad = 4;
  const fits = (n) => {
    const y = n === 0 ? 0 : floorTop(n - 1) - CFG.slab;
    const p = toCam(lx - 3.4, y, -3);
    const sy = H * VY - p[1] * (cam.f / max(p[2], 1));
    if (sy < pad || sy > H - pad) return false;                 /* fuera del alto */
    ctx.font = '400 10px "IBM Plex Mono", ui-monospace, monospace';
    return ctx.measureText('+' + y.toFixed(1)).width <= screenX(lx - 3.4, -3);
  };

  /* Se prueban de arriba abajo y se corta en cuanto uno no cabe: si el
     nivel más alto no entra, los que están por encima tampoco. El de
     la base (+0.0) se conserva siempre —sin él la torre pierde la
     referencia del suelo— y con él baja el último que sí quepa. */
  let top = levels.length - 1;
  while (top > 0 && !fits(levels[top])) top--;

  for (let i = 0; i <= top; i++) {
    const n = levels[i];
    const y = n === 0 ? 0 : floorTop(n - 1) - CFG.slab;
    /* Línea de cota, con sus extremos cortados */
    seg(lx - 2.4, y, -3, lx + 2.4, y, -3, st.hair(0.36));
    seg(lx - 2.4, y - 1.1, -3, lx - 2.4, y + 1.1, -3, st.hair(0.36));
    seg(lx + 2.4, y - 1.1, -3, lx + 2.4, y + 1.1, -3, st.hair(0.36));
    /* Abandonoía hasta el fuste */
    seg(lx + 2.4, y, -3, edge, y, -CFG.tower / 2, st.faint(0.34));
    label(lx - 3.4, y, -3, '+' + y.toFixed(1), { w: 10, c: P.ink3, a: 0.9, mid: true });
  }
}

function selection() {
  if (sel === -1 || sel >= Math.floor(work.built)) return;
  const y = CFG.podium.h + sel * CFG.fh;
  const half = CFG.tower / 2 + 1.1, r = st.red(0.9, 1.8);
  ring(0, y, 0, half * 2, half * 2, r);
  const lx = -half - 3;
  seg(lx, y, -CFG.tower / 2, lx, y, CFG.tower / 2, r);
  seg(lx, y, -CFG.tower / 2, -half, y, -CFG.tower / 2, st.red(0.5, 1.2));
  seg(lx, y, CFG.tower / 2, -half, y, CFG.tower / 2, st.red(0.5, 1.2));
  label(lx - 1.4, y, 0, '+' + y.toFixed(1), { w: 11, c: P.accent, a: 1, mid: true, accent: true });
}

function build() {
  prims.length = 0;
  ground(); city(); podium(); tower(); scaffold(); craneMesh(); dims(); selection();
  prims.sort((a, b) => b.z - a.z);
}

/* ------------------------------------------------------------
   8. PINTAR
   ------------------------------------------------------------ */
/* Se proyecta en sitio, sin arrays intermedios. Con unas 500 primitivas
   eso son 2 000 objetos nuevos por frame; el recolector losAVA en
   pleno bucle de animación, que es donde más molesta. Los vértices ya
   están en espacio de cámara, así que solo falta dividir por z. */
const P4 = new Float64Array(8);
/* Ancho en píxeles de pantalla que queda a la izquierda de un punto del
   mundo, ya proyectado. Lo usa dims() para decidir si un rótulo cabe
   antes de dibujarlo: proyectar con project() escribiría en P4 y
   rompería al llamador, que Projection también la usa. */
function screenX(x, z) {
  const c = toCam(x, 0, z);
  return W * shift + c[0] * (cam.f / max(c[2], 1));
}
function project(c, out, at) {
  const s = cam.f / max(c[2], 1);
  out[at] = W * shift + c[0] * s;
  out[at + 1] = H * VY - c[1] * s;
}
function paint() {
  ctx.clearRect(0, 0, W, H);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (let i = 0; i < prims.length; i++) {
    const it = prims[i], st = it.st;
    if (it.k === 0) {
      const q = it.q;
      project(q[0], P4, 0); project(q[1], P4, 2);
      project(q[2], P4, 4); project(q[3], P4, 6);
      ctx.beginPath();
      ctx.moveTo(P4[0], P4[1]);
      ctx.lineTo(P4[2], P4[3]); ctx.lineTo(P4[4], P4[5]); ctx.lineTo(P4[6], P4[7]);
      ctx.closePath();
      if (st.fill) { ctx.fillStyle = st.fill; ctx.fill(); }
      ctx.strokeStyle = rgba(st.c, st.a);
      ctx.lineWidth = st.w;
      ctx.stroke();
    } else if (it.k === 1) {
      project(it.a, P4, 0); project(it.b, P4, 2);
      ctx.strokeStyle = rgba(st.c, st.a);
      ctx.lineWidth = st.w;
      ctx.beginPath();
      ctx.moveTo(P4[0], P4[1]); ctx.lineTo(P4[2], P4[3]);
      ctx.stroke();
    } else {
      project(it.p, P4, 0);
      ctx.font = '400 ' + st.w + 'px "IBM Plex Mono", ui-monospace, monospace';
      ctx.fillStyle = rgba(st.c, st.a);
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(it.str, P4[0], P4[1]);
    }
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

/* ------------------------------------------------------------
   9. BUCLE
   ------------------------------------------------------------ */
let clock = 0, playing = !reduced, painted = false, raf = 0, last = 0;
let frames = 0, framesSlot = -1;

/* El fundido de entrada y de salida.
   Antes la escena se cortaba en seco al salir de pantalla: el bucle
   paraba en el frame en que el IntersectionObjector avisaba y, al
   volver, aparecía de golpe. Al bajar el CTA y el índice eso se nota
   como un parpadeo.

   El objetivo son 0 y 1, y son alcanzables sin coste: el póster sigue
   debajo y con el lienzo transparente se ve igual de bien, así que
   solo hace falta pintar los intermedios. Por eso el bucle sigue vivo
   durante el fundido y se apaga al llegar a 1 (ver stopFade()). */
let fade = 1, fadeTo = 1, fadeRAF = 0, fadeFrom = 1, fadeStart = 0;
/* El fundido dura lo que dice: 220 ms, lineales. Antes era exponencial
   con constante 5,2 y eso NO eran 190 ms de un extremo a otro: la
   constante es el tiempo en el que se recorre el 63 %, así que el
   fundido tardaba un segundo en terminar. Medido con rAF dentro de la
   página (ver AVANCES.md): 963 ms reales. */
const FADE_MS = 220;

function fadeLoop(now) {
  fadeRAF = requestAnimationFrame(fadeLoop);
  const p = min(1, (now - fadeStart) / FADE_MS);
  fade = fadeFrom + (fadeTo - fadeFrom) * p;
  if (p >= 1) {
    fade = fadeTo;
    cancelAnimationFrame(fadeRAF); fadeRAF = 0;
    /* is-fading se retira SIEMPRE que el fundido llega a 1, no solo
       cuando el bucle principal está parado: al volver a entrar los
       dos corren a la vez, y con la condición de "si no hay raf" la
       clase se quedaba puesta con el lienzo ya opaco — es decir,
       invisible. */
    if (fade === 1) root.classList.remove('is-fading');
    return;
  }
  build(); paint();
}
/* Se apaga solo cuando ya no queda nada que dibujar: durante el
   fundido el bucle principal puede estar parado (fuera de pantalla)
   y este es quien hace los intermedios. */
function fadeTo_(v) {
  if (reduced) { fade = 1; fadeTo = 1; build(); paint(); return; }
  if (v === fade && !fadeRAF) return;
  fadeFrom = fade;              /* si se interrumpe, sigue desde donde está */
  fadeTo = v;
  fadeStart = performance.now();
  if (v < 1) root.classList.add('is-fading');
  if (!fadeRAF) fadeRAF = requestAnimationFrame(fadeLoop);
}

function loop(now) {
  raf = requestAnimationFrame(loop);
  const dt = min((now - last) / 1000, 0.05);
  last = now;

  /* Autocorrección del tamaño.
     El ResizeObserver llega demasiado pronto: en el primer frame la
     página todavía no ha resuelto la barra de desplazamiento ni las
     fuentes, y el elemento mide otra cosa. Si nos quedamos con esa
     medida el dibujo sale comprimido y el clic cae en el piso
     equivocado. En vez de confiar en un evento se comprueba el tamaño
     real cada seis frames —si algo no cuadra se vuelve a medir—,
     porque eso no depende de cuándo lleguen las notificaciones. */
  if (((frames++ / 6) | 0) !== framesSlot) {
    framesSlot = (frames / 6) | 0;
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (cw > 2 && ch > 2 && (cw !== W || ch !== H)) size();
  }

  if (playing) { clock += dt; tick(dt); }
  stepCrane(dt);

  /* Las ventanas se encienden al terminar la obra, con retardo
     escalonado de abajo arriba. */
  const start = work.total;
  for (let i = 0; i < CFG.floors; i++) {
    if (i < CFG.prebuilt) { lamps[i] = 1; continue; }
    const at = start + (i - CFG.prebuilt) * 0.16;
    if (work.done && clock > at) lamps[i] = min(1, lamps[i] + dt * 2.2);
    else if (!work.done) lamps[i] = 0;
  }

  build(); paint(); hud();

  if (!painted) { painted = true; root.classList.add('is-live'); }
}
function start() { if (raf) return; last = performance.now(); raf = requestAnimationFrame(loop); }
function stop() { if (!raf) return; cancelAnimationFrame(raf); raf = 0; }

function hud() {
  if (elBar) elBar.style.transform = 'scaleX(' + (work.built / CFG.floors).toFixed(3) + ')';
  if (!elRead) return;
  let a, b;
  if (sel !== -1 && sel < Math.floor(work.built)) {
    const y = CFG.podium.h + sel * CFG.fh;
    a = 'Piso ' + pad2(sel + 1);
    b = '+' + y.toFixed(1) + ' m · ' + (sel < CFG.prebuilt ? 'terminado' : 'en obra');
  } else if (work.done) {
    a = '24 pisos entregados';
    b = 'garantía estructural de 10 años';
  } else {
    a = 'Piso ' + pad2(min(CFG.floors, Math.ceil(work.built))) + ' en obra';
    b = 'estructura · fachada · acabados';
  }
  if (elRead.dataset.k !== a) {
    elRead.dataset.k = a;
    elRead.innerHTML = '<b>' + a + '</b><span>' + b + '</span>';
  }
}
function playLabel() {
  if (!elPlay) return;
  elPlay.setAttribute('aria-pressed', String(!playing));
  const s = elPlay.querySelector('.mono');
  if (s) s.textContent = playing ? 'Pausar' : 'Seguir';
}
function announce() {
  if (!elLive) return;
  elLive.textContent = sel === -1
    ? 'Torre Chapinero Alto: 24 pisos en construcción.'
    : 'Piso ' + (sel + 1) + ' seleccionado. Cota más ' +
      (CFG.podium.h + sel * CFG.fh).toFixed(1) + ' metros.';
}

/* Repintar a mano.
   Con menos movimiento no hay bucle de animación —la escena es un
   fotograma—, así que cualquier cambio de estado tenía que redibujar o
   se quedaba a medias: la cartela mostraba la etapa anterior y el piso
   no se marcaba. Con el bucle en marcha esto no hace falta, porque él
   repinta en cada frame. */
function repaint() { if (raf) return; build(); paint(); hud(); }

/* ------------------------------------------------------------
   10. RATÓN Y TECLADO
   ------------------------------------------------------------ */
function inPoly(x, y, q) {
  let c = false;
  for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
    if ((q[i][1] > y) !== (q[j][1] > y) &&
        x < (q[j][0] - q[i][0]) * (y - q[i][1]) / (q[j][1] - q[i][1]) + q[i][0]) c = !c;
  }
  return c;
}
function hit(mx, my) {
  /* Clic sobre un piso: se prueban sus caras visibles, de la más
     cercana a la más lejana, y se gana la más cercana que contenga el
     puntero. Sin z-buffer basta con quedarse con la de menor z. */
  let best = -1, bz = Infinity;
  const half = CFG.tower / 2, slab = CFG.slab;
  const top = min(CFG.floors, Math.floor(work.built));
  for (let i = 0; i < top; i++) {
    const y0 = CFG.podium.h + i * CFG.fh;
    const v = [[-half, y0, -half], [half, y0, -half], [half, y0, half], [-half, y0, half],
               [-half, y0 + slab, -half], [half, y0 + slab, -half], [half, y0 + slab, half], [-half, y0 + slab, half]];
    for (let f = 0; f < 6; f++) {
      const q = F[f].map((n) => screen(toCam(v[n][0], v[n][1], v[n][2])));
      if (!inPoly(mx, my, q)) continue;
      const z = min(q[0][2], q[1][2], q[2][2], q[3][2]);
      if (z < bz) { bz = z; best = i; }
    }
  }
  return best;
}

let sel = -1, hover = -1, drag = null;

function local(e) {
  const r = canvas.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}

if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY, az: cam.az, el: cam.el, moved: 0 };
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.moved = max(drag.moved, abs(dx) + abs(dy));
      cam.az = clamp(drag.az - dx * 0.006, CFG.orbit.minAz, CFG.orbit.maxAz);
      cam.el = clamp(drag.el + dy * 0.004, CFG.orbit.minEl, CFG.orbit.maxEl);
      repaint();
      return;
    }
    const p = local(e), h = hit(p[0], p[1]);
    if (h !== hover) { hover = h; canvas.style.cursor = h === -1 ? 'grab' : 'pointer'; }
  });
  const release = (e) => {
    if (drag && drag.moved < 5) {
      const p = local(e);
      sel = hit(p[0], p[1]);
      announce();
      repaint();
    }
    drag = null;
    canvas.style.cursor = 'grab';
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', () => { drag = null; canvas.style.cursor = 'grab'; });
  canvas.style.cursor = 'grab';
} else {
  /* En táctil el arrastre es el gesto natural, así que el clic va en
     el mismo evento y no en un pointerup que exige puntero fino. */
  let downAt = 0;
  canvas.addEventListener('pointerdown', () => { downAt = Date.now(); });
  canvas.addEventListener('pointerup', (e) => {
    if (Date.now() - downAt < 400) { const p = local(e); sel = hit(p[0], p[1]); announce(); repaint(); }
  });
}

root.addEventListener('keydown', (e) => {
  if (e.target !== root && e.target !== canvas) return;
  let used = true;
  switch (e.key) {
    case 'ArrowLeft':  cam.az = clamp(cam.az - 0.16, CFG.orbit.minAz, CFG.orbit.maxAz); break;
    case 'ArrowRight': cam.az = clamp(cam.az + 0.16, CFG.orbit.minAz, CFG.orbit.maxAz); break;
    case 'ArrowUp':    cam.el = clamp(cam.el + 0.10, CFG.orbit.minEl, CFG.orbit.maxEl); break;
    case 'ArrowDown':  cam.el = clamp(cam.el - 0.10, CFG.orbit.minEl, CFG.orbit.maxEl); break;
    case 'Home':       cam.az = -0.62; cam.el = 0.28; break;
    case 'Enter': case ' ': {
      /* El modulo necesita un divisor: con prebuilt a 0 y la obra
         recién empezada, floor(work.built) sería 0 y salía NaN. */
      const n = min(CFG.floors, Math.floor(work.built));
      sel = n > 0 ? (sel + 1) % n : -1;
      announce();
      break;
    }
    case 'Escape': sel = -1; announce(); break;
    case 'r': case 'R':
      clock = 0; sel = -1; playing = true; playLabel(); announce();
      break;
    case 'g': case 'G':
      if (reduced) break;          /* con menos movimiento no hay bucle */
      playing = !playing; playLabel();
      if (elLive) elLive.textContent = playing ? 'Construcción reanudada.' : 'Construcción en pausa.';
      break;
    default: used = false;
  }
  if (used) { e.preventDefault(); repaint(); }
});

if (elPlay) elPlay.addEventListener('click', () => { playing = !playing; playLabel(); repaint(); });

/* ------------------------------------------------------------
   11. ARRANQUE
   ------------------------------------------------------------ */
let ro = null;
let booted = false;

function size() {
  /* Se mide el RECTÁNGULO MOSTRADO del canvas, no su atributo width ni
     el contenedor. Es la única medida que comparten las dos cosas que
     dependen de W y H: el dibujo y el hit-test. Si el búfer y lo que
     se ve no coinciden, el dibujo sale comprimido y el clic cae en el
     piso equivocado —que es exactamente lo que pasaba antes, con la
     escena dibujada en 1646 px y soltada sobre 1440.

     Es seguro porque el CSS fija el canvas a width/height 100%: su
     rect no depende de su propio atributo width, así que una medición
     vieja no puede realimentarse. */
  const r = canvas.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  W = r.width; H = r.height;

  /* En pantallas estrechas se sube menos: para una escena de líneas,
     1,5x es indistinguible de 2x y quita el 44 % de los píxeles que hay
     que rellenar. En un móvil con la CPU reducida eso es la diferencia
     entre ir a 60 fps y no ir. */
  dpr = min(window.devicePixelRatio || 1, W < 640 ? 1.5 : 2);
  /* Solo se toca el búfer de píxeles. El tamaño mostrado lo manda el
     CSS, así que ninguna medición puede hacer que el canvas desborde
     la página. */
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  /* El encuadre sale del tamaño del lienzo, no de una tabla de
     formatos: la lámina es una columna estrecha dentro del hero y su
     proporción cambia entre escritorio, tableta y móvil. Lo único que
     hay que decidir es cuánto mundo tiene que verse (CFG.fit) y que no
     entre ni en la cartela ni en los bordes. */
  const f = CFG.fit, m = 10;
  const utilH = Math.max(H - CFG.cartela - 2 * m, 60);
  const esc = Math.min((W - 2 * m) / (f.x1 - f.x0), utilH / (f.y1 - f.y0));
  cam.dist = clamp(cam.f / esc - CFG.ty * sin(cam.el), 150, 900);
  /* El origen del mundo (el suelo) no se dibuja donde se pone: la
     cámara orbita un punto a CFG.ty de alto, así que el suelo sale por
     debajo. Se compensa para que el suelo caiga justo encima de la
     cartela. */
  const sg = cam.f / (cam.dist + CFG.ty * sin(cam.el));
  VY = (H - CFG.cartela - m - CFG.ty * cos(cam.el) * sg) / H;
  shift = 0.5 - ((f.x0 + f.x1) / 2) * sg / W;
  return true;
}

function onResize() {
  if (!size()) return;
  /* Redimensionar no reinicia la obra, solo vuelve a pintar: el
     reloj y la torre siguen donde estaban. */
  if (!playing) { build(); paint(); }
}

function inView() {
  const r = root.getBoundingClientRect();
  return r.bottom > 0 && r.top < window.innerHeight;
}

function boot() {
  /* En un <script defer> el document.readyState ya es "interactive"
     cuando se ejecuta el código, así que la escena arrancaba aquí y
     otra vez en DOMContentLoaded: dos ResizeObserver, dos
     IntersectionObserver, dos listeners de visibilidad y dos bucles de
     animación. Peor: el primer size() medía antes de que la página
     tuviera scrollbar, y el canvas se quedaba con un ancho que ya no
     era el real. El guard es lo que arregla las dos cosas. */
  if (booted) return;
  booted = true;

  /* El observador se instala ANTES de la primera medida y se queda
     aunque esta falle. Antes, si el escenario todavía no tenía tamaño,
     boot() se salía por el return y la escena se quedaba muerta para
     siempre: sin bucle, sin observador, sin poster. Con el observador
     puesto ya, el primer tamaño real la despierta. */
  ro = new ResizeObserver(onResize);
  ro.observe(canvas);
  /* El encuadre depende del ancho de la página, así que también hay que
     oírla: con el lienzo en una columna de ancho fijo, un cambio de
     ventana no lo redimensiona pero sí cambia el formato. */
  window.addEventListener('resize', onResize);
  if (!size()) return;

  if (reduced) {
    /* Un fotograma y quieto: la torre entera, con las ventanas
       encendidas y la grúa en reposo. El usuario puede girar y elegir
       pisos, porque eso lo ha pedido él.
       Y el botón de pausa se retira: aquí no hay nada que pausar, así
       que ofrecerlo sería un control que no hace nada. */
    playing = false;
    if (elPlay) elPlay.parentNode.removeChild(elPlay);
    clock = CFG.perFloor * (CFG.floors - CFG.prebuilt) + 4;
    tick(0); stepCrane(0);
    for (let i = 0; i < CFG.floors; i++) lamps[i] = 1;
    build(); paint(); hud();
    root.classList.add('is-live');
    canvas.style.cursor = 'default';
  } else if (inView()) {
    start();
  }
  playLabel();
  announce();

  /* Fuera de pantalla no se dibuja. La portada es la página más larga
     del sitio y esta escena puede quedar siete pantallas abajo.

     El corte va con un fundido corto en vez de a matar: al bajar al CTA
     y al índice se veía un parpadeo. Al salir, el bucle principal se
     para YA (seguir animando la grúa fuera de pantalla sería gastar
     batería) y el fundido se encarga solo de los ultimos pasos; al
     entrar, el bucle arranca con el fundido desde 0. Los objetivos son
     0 y 1 a proposito: el poster sigue debajo y con el lienzo
     transparente se ve igual de bien. */
  new IntersectionObserver((es) => {
    es.forEach((en) => {
      if (reduced) return;
      if (en.isIntersecting) { if (!raf) { fadeTo_(1); start(); } }
      else if (raf) { stop(); fadeTo_(0); }
    });
  }, { threshold: 0 }).observe(root);

  document.addEventListener('visibilitychange', () => {
    if (reduced) return;
    if (document.hidden) { stop(); fadeTo_(0); }
    else if (inView()) { fadeTo_(1); start(); }
  });

}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();