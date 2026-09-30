# SCROLLYTELLING — la Torre Chapinero Alto

La portada de CONSTRUMAX es una lámina de dibujo que se construye con el
scroll. Siete etapas, siete pantallas de recorrido, un solo edificio.

Todo lo que se explica aquí está en tres sitios: `index.html` (estructura y
SVG), `styles.css` (sección **10. ESCENA DE CONSTRUCCIÓN**) y el módulo
`Scrolly` de `script.js`.

---

## 1. El concepto

**PLANO VIVO.** El edificio que se levanta es la *Torre Chapinero Alto*, la
misma torre del pie `Fig. 01` del hero, y alrededor dos bodies más del
portafolio. El dibujo usa el lenguaje editorial del sitio: líneas de 1px,
relleno plano, sin degradados, sin sombras, sin esquinas redondeadas, y el
rojo de plano (`--accent`) como único color.

La lámina se presenta como una hoja con cartela, igual que un plano: cotas de
nivel (+0.0, +19.2, +38.4, +57.6, +76.8), grúa torre, andamios, foso con
canastas de acero, retroexcavadora, volqueta y tres obreros en silueta.

El cielo recorre los tokens de marca, no colores nuevos:

| Momento | Token | Color |
|---|---|---|
| Amanecer | `--paper` | `#F2F0EA` |
| Mañana / mediodía | `--paper-2`, `--paper-3` | `#E9E6DD`, `#DCD8CC` |
| Crepúsculo | `--ink-2` | `#3B392E` |
| Noche | `--ink` | `#16150F` |

Al llegar la noche la línea de la torre pasa de tinta a papel (transición
CSS de 0.5 s) y las ventanas se encienden una a una, con un cuarto de ellas
en rojo de plano.

### Las siete etapas

| # | Etapa | Qué se construye | Qué se lee |
|---|---|---|---|
| 01 | Terreno | El solar, las cotas, el sol | Diseño y planos |
| 02 | Excavación | El foso, la maquinaria, los obreros | Cimentación |
| 03 | Cimientos | Canastas de acero y placa de fundación | *"Es la única parte de la obra que no se puede repetir."* |
| 04 | Estructura | La grúa llega y suben los 56 pisos | Estructura y fachada |
| 05 | Envolvente | Ladrillo, vidrio y andamios | Entrega de llaves |
| 06 | Acabados | Se desmonta el andamio, se corona la obra | No dibujamos torres. *Las sostenemos.* |
| 07 | Entrega | Atardecer, luces encendidas, cifras y CTA | 47 proyectos · 312.000 m² · 10 años |

---

## 2. Cómo está montada la línea de tiempo

```
.scene                    posición de referencia
├── .scene__intro         el umbral: "Cuatro etapas. Un solo equipo."
└── .scene__body          ← el ScrollTrigger vigila este bloque
    ├── .scene__viewport  position:sticky · 100dvh · la lámina
    └── .scene__panels    los 7 <li class="panel"> en flujo normal
```

Dos decisiones que explican casi todo:

1. **La lámina se ancla con `position: sticky`, no con el pin de GSAP.** No
   hace falta pin-spacer, así que no hay CLS, y `ScrollTrigger` solo tiene
   que medir un progreso.
2. **Los paneles nunca salen del flujo normal.** Son `<li>` de altura
   completa que pasan por la línea de lectura. Por eso la escena se lee,
   se navega con el teclado, la indexan los buscadores y sigue funcionando
   sin JavaScript: no hay nada que "revelar".

El `ScrollTrigger` usa `start: 'top top'` y `end: 'bottom bottom'` sobre
`.scene__body`: empieza cuando el bloque llega arriba y termina cuando
llega abajo, que es justo cuando la lámina deja de estar anclada.

Los límites de cada etapa **no están escritos a mano**: `measure()` calcula
el centro de cada panel dentro del recorrido y `paint()` calcula su
distancia a la línea de lectura. El contador "Etapa 04 / 07" sale de ahí, no
de los pesos, de modo que el rótulo y el texto que se está leyendo nunca se
contradicen aunque cambies alturas, tipografías o pesos.

### Un solo oyente de scroll

El módulo `Scrolly` no registra ningún `scroll`. Todo cuelga de:

- **`tl.eventCallback('onUpdate', paint)`** — la timeline avisa en cada
  paso, incluida la puesta al día final del `scrub`. Si el pintado se
  enganchara al `onUpdate` del trigger, el contador se quedaría congelado
  mientras la escena alcanza su posición, porque con `scrub` el trigger
  solo avisa al mover el scroll.
- **`onRefresh: measure`** — recalcula las posiciones al cambiar de ruta,
  al redimensionar y al girar la pantalla.

---

## 3. Cómo ajustar las duraciones

### Qué dura cada etapa

Todo sale de `CFG.stages` al principio del módulo. `w` es el **peso
relativo** de la etapa; no tienen que sumar 1 porque se normalizan solas.
El recorrido completo dura siempre 1, así que subir un peso estira las demás.

```js
stages: [
  { n: '01', name: 'Terreno',    w: 0.85 },
  { n: '02', name: 'Excavación', w: 1.00 },
  { n: '03', name: 'Cimientos',  w: 1.00 },
  { n: '04', name: 'Estructura', w: 1.55 },   // <- la que más construye
  { n: '05', name: 'Envolvente', w: 1.25 },
  { n: '06', name: 'Acabados',   w: 1.00 },
  { n: '07', name: 'Entrega',    w: 1.35 }
]
```

Los tween de cada etapa se colocan con `at[k]` (instante de arranque) y
`seg(k, f)` (fracción de la etapa). Si añades una etapa, `at` y `seg` se
ajustan solos; recuerda añadir también su `<li class="panel">` y su botón
en `.scene__chapters`.

### Cuán larga es la escena

En CSS, con una variable por salto:

```css
:root{ --panel-h:100dvh; --scene-h:40dvh; }                     /* ≥1200 */
@media (max-width:1199px) and (min-width:900px){ --panel-h:86dvh }
@media (max-width:899px){ --panel-h:56dvh; --scene-h:40dvh }     /* vertical */
@media (max-width:520px){ --panel-h:50dvh }
```

`--panel-h` es el alto mínimo de cada etapa, o sea la longitud total:
7 × 100dvh ≈ siete pantallas en escritorio. **Bájalo si la escena se hace
larga** (la causa número uno de abandono en móvil).

`--scene-h` es el alto de la lámina en vertical. Ojo: `CFG.read.narrow`
(0.68) es la línea de lectura y **tiene que coincidir** con la composición
del CSS; si cambias uno, cambia el otro.

### Suavidad del scroll

```js
scrub: 0.55   // en el ScrollTrigger
```

Más alto = más inercia y más suave; `1` es el tope (se pega al scroll);
`0` lo hace instantáneo. No lo pongas a 0: el scrub es lo que da la
sensación de película.

### Granularidad del cielo

```js
steps: 240    // pasos de color en toda la escena
```

El cielo no se recalcula a 60 escrituras por segundo, sino 240 veces en
todo el recorrido, con una transición CSS de 0.16 s que disimula el salto.
Bajarlo ahorra escrituras, subirlo da un degradado más fino.

---

## 4. Cómo cambiar los textos de cada etapa

**Los textos están en el HTML, no en JavaScript.** No hay nada que
sincronizar: se editan en `index.html` dentro de
`<ol class="scene__panels">`.

```html
<li class="panel" id="etapa-3" data-stage="3">
  <p class="mono kicker"><span class="kicker__tick"></span>Etapa 04 — Estructura</p>
  <h3 class="panel__t">Estructura y fachada</h3>
  <p class="panel__d">Concreto reforzado en sitio…</p>
  <figure class="panel__fig"><img src="…" alt="…"></figure>
</li>
```

- El `id="etapa-N"` es el destino del botón de capítulo N.
- `data-stage` solo se usa como referencia; el orden real lo da el DOM.
- Para quitar la foto, borra el `<figure class="panel__fig">` entero: el
  panel se centra igual.
- Si cambias el **nombre de la etapa** (el que aparece en la cartela y en
  los capítulos), ese texto sí está en dos sitios que hay que tocar juntos:
  `CFG.stages[i].name` en `script.js` y el `<span>` del botón en
  `index.html`. Si se desincronizan, el rótulo de la cartela gana: sale de
  la posición del panel, no del nombre.

---

## 5. Cómo cambiar los colores

Todo el color de la lámina sale de cuatro variables CSS registradas:

```css
@property --sky { syntax:'<color>'; inherits:true; initial-value:#E9E6DD; }
@property --line{ … }   /* tinta del dibujo   */
@property --lamp{ … }   /* ventanas encendidas */
@property --sil { … }   /* maquinaria y siluetas */
```

| Quiero… | Dónde |
|---|---|
| Cambiar el recorrido del cielo | `CFG.sky` en `script.js` (pares progreso/color) |
| Cambiar el color del atardecer | La última barra de `CFG.sky` (por defecto `--ink`) |
| Cambiar el punto en el que cae la noche | `CFG.night` (0.90) |
| Cambiar cómo se ve la torre de día | `.ms-b`, `.fl__sl`, `.fl__gh` en `styles.css` |
| Cambiar la franja roja del horizonte | `.sk-band{ fill:var(--accent) }` y la opacidad del tween |

**No añadas colores nuevos al sistema.** La paleta es papel cálido + tinta +
rojo de plano; si necesitas un tono, derívalo de esos.

Si el navegador no soporta `@property` (Firefox < 128), el paso a modo
noche es un corte seco en lugar de una transición. Todo lo demás funciona
igual.

---

## 6. Cómo reemplazar el edificio

### Editar el dibujo a mano

El SVG va **en línea dentro de `index.html`**, no en un archivo aparte: así
lo puede estilar el CSS y no hay peticiones extra ni saltos de carga. Para
cambiar el edificio, edita ese `<svg class="tw">`.

| Clase | Qué es |
|---|---|
| `.fl` | un piso. Hay 56. Llevan `data-i` con su altura. |
| `.fl__sl` | la losa |
| `.fl__gh` | el vidrio apagado |
| `.fl__br` | el ladrillo (patrón `url(#px-brick)`) |
| `.fl__w` | un vano **encendido**, con `data-o` = orden de encendido |
| `.tw-pit` `.tw-rebar` `.tw-found` | foso, acero y placa |
| `.tw-crane` `.cn-mast` `.cn-jib` `.cn-hook` | grúa, por partes |
| `.tw-scaf` | andamios |
| `.tw-crown` | coronación (cornisa, tanque, antena) |
| `.tw-city` `.cl` | entorno y estratos de cielo, con `data-d` de parallax |
| `.tw-work` | maquinaria y obreros |

Cambiar el número de pisos = duplicar o borrar `<g class="fl">`. El orden
en el DOM no importa: `Scrolly` los reordena por altura, y el andamiaje sube
como en una grúa real. Las cotas (`.tw-dims`) son texto suelto: ajústalas a
mano si cambias la altura del piso.

Cambiar el encuadre = el `viewBox="0 0 700 900"` y `preserveAspectRatio`.
El lienzo es vertical a propósito: la columna de la escena es más alta que
ancha. `xMidYMax slice` recorta lo justo y ancla el terreno abajo.

### Regenerar el dibujo desde código

El SVG es determinista y sale de un generador de ~200 líneas (sembrado con
un LCG, así que las ventanas siempre se encienden en el mismo orden). La
lógica, para referencia:

```js
const G = 760, FH = 15, W = 700, H = 900;
const TOWERS = [
  { id:'t1', x:305, w:90, n:24, b:5 },   // Chapinero Alto
  { id:'t2', x:195, w:90, n:18, b:4 },   // Santa Ana
  { id:'t3', x:420, w:80, n:12, b:4 },   // Calle 100
  { id:'pb', x:175, w:350, n:2,  b:10 }  // podio comercial
];
// por cada torre y cada piso:
//   losa  y = G - (i+1)*FH + FH - 2,  alto 2
//   vidrio y = G - (i+1)*FH + 2.5,     alto 7
//   ladrillo = el vidrio con fill="url(#px-brick)"
//   vanos   = b rectángulos de (w - 2*pad)/b de ancho, encendidos al azar
```

Para volver a generarlo: escribe el generador, vuelca el SVG a un archivo y
sustituye el bloque `<svg class="tw">…</svg>` de `index.html`. Recuerda
comprobar que el SVG sigue siendo XML válido.

### Cambiarlo por una secuencia de frames (opción B)

Si más adelante consigues renders reales, esta es la ruta. El módulo no lo
trae implementado, pero el sitio no lo necesita:

1. **Exporta los frames** desde tu renders o video:

   ```bash
   ffmpeg -i obra.mp4 -vf "fps=12,scale=1400:-2" -q:v 4 frames/%04d.webp
   # o desde una secuencia PNG ya renderizada:
   ffmpeg -framerate 12 -i renders/%04d.png -c:v libwebp -quality 82 \
          -qmin 4 frames/%04d.webp
   ```

   Parámetros recomendados: **144 frames** (12 s), **1400×800 px**, WebP
   calidad 82, entre 1 y 1,5 MB en total. En móvil, una versión de
   **72 frames a 720×420** y calidad 70, con `loading="lazy"`.

2. **Crea el `<canvas>`** encima de `.scene__paper` (donde ahora está el
   `<svg class="tw">`), con `width`/`height` reales y CSS al 100 %.

3. **En `Scrolly.build()`**, sustituye los tween del SVG por:

   ```js
   const draw = (i) => { if (i !== frame) { ctx.drawImage(frames[i], 0, 0, cw, ch); frame = i; } };
   tl.to({ i: 0 }, { i: frames.length - 1, ease: 'none',
                     onUpdate() { draw(Math.round(this.targets()[0].i)); } }, 0);
   ```

4. **Recarga progresiva**: descarga primero los frames 0, 144 y 72 (para
   tener algo que pintar), después el resto en lotes de 24 con
   `requestIdleCallback`. Si una imagen no ha llegado, conserva la anterior
   en vez de limpiar el canvas.

5. **No hagas esto en móvil** con la escena completa: 144 texturas
   decodificadas son ~500 MB de memoria. O versionas reducidas, o dejas el
   SVG (que pesa 31 KB y va a 60 fps en un móvil de gama media con el CPU
   limitado ×4).

---

## 7. Cómo desactivar la animación

De más a menos invasivo:

| Quiero | Cómo |
|---|---|
| **Apagarla un rato, sin tocar código** | Playwright/Puppeteer con `reducedMotion:'reduce'`, o el ajuste del sistema. La lámina se queda estática con la obra terminada. |
| **Apagarla para quien tenga movimiento reducido** | Ya está hecho: el script del `<head>` no añade `.st`, y `Scrolly.watchMotion()` reevalúa si la preferencia cambia con la página abierta. |
| **Apagarla del todo** | Borra las dos líneas de `<script>` de GSAP en el final de `index.html`. El resto del sitio sigue igual. |
| **Convertir la escena en una sección normal** | Quita `st` del script del `<head>` y `Scrolly.init()` del arranque. Los paneles quedan apilados y la lámina, como una imagen de 30rem de ancho. |
| **Quitar la escena entera** | Borra el bloque `<div class="scene">` de `index.html` y `Scrolly.init()`. Los paneles se pierden con él, así que copia antes su contenido. |

Ninguna de estas opciones rompe el resto del sitio: el router, el índice de
proyectos, las fichas y el formulario son independientes de `Scrolly`.

---

## 8. Accesibilidad y robustez

- **Sin JavaScript**: la escena se queda en lámina estática + paneles
  apilados, y **los siete paneles son legibles**. El HTML es el de la
  portada completa; la lámina es una imagen con `<title>` y `<desc>`.
  (Las otras cuatro rutas sí necesitan JavaScript: el router es por hash
  desde el principio del proyecto, no es un cambio de este trabajo.)
- **`prefers-reduced-motion`**: sin animación, sin scroll anclado, con
  `will-change` anulado. Si la preferencia cambia con la página abierta, la
  escena se arma o se desarma en caliente.
- **Teclado y lector de pantalla**: la navegación por capítulos es un
  `<nav>` con `<button>` reales y `aria-current`. El HUD es `aria-hidden`
  porque su información ya está en el `<h3>` del panel. El SVG lleva
  `role="img"` con `<title>`/`<desc>`. La jerarquía es `h1` (hero) → `h2`
  (umbral de la escena) → `h3` (cada etapa) → `h3` (CTA final).
- **Contraste**: los paneles nunca cambian de fondo —solo la lámina—, así
  que el AA se mantiene incluso en la etapa nocturna. Por eso el HUD lleva
  fondo de papel.
- **Impresión**: la lámina y el HUD se ocultan; los paneles salen como
  texto normal.
- **`dvh` en todo el escenario**, `ScrollTrigger.config({ignoreMobileResize:true})`
  y re-medición en `orientationchange`, para la barra de direcciones del
  móvil.

## 9. Rendimiento

Medido con Chromium headless en un scroll continuo de ~540 px/s:

| | Mediana | p95 | Frames a 60 fps | LCP | CLS |
|---|---|---|---|---|---|
| Escritorio 1440×900 | 16,7 ms | 19,1 ms | 97 % | 432 ms | 0,0002 |
| Móvil 390×844, CPU ×4 | 16,6 ms | 19,4 ms | 96 % | 508 ms | 0,001 |

En un stress test más duro (120 saltos de scroll de golpe, cada uno del
tamaño de una pantalla) la mediana se mantiene en 16,7 ms y solo el
13–19 % de los frames pasa de 20 ms.

Decisiones que lo sostienen, y que conviene no deshacer sin motivo:

- El SVG **no** se repinta al cambiar el cielo: el cielo es un div aparte.
- Los pisos animan `opacity` y `translate` de 5 unidades, no `height`.
- `will-change` solo en los paneles, que sí cambian de opacidad cada frame.
- El color del cielo se escribe 240 veces en todo el recorrido, no miles.
- Los paneles solo reciben estilos cuando el valor cuantizado cambia.
- `Peek` no mantiene un `rAF` infinito cuando no hay vista previa abierta,
  y `Chrome.initBar` cachea `scrollHeight`.

## 10. Dependencias

| Qué | Por qué | Licencia |
|---|---|---|
| `vendor/gsap.min.js` (73 KB) | Timelines con `scrub` y control fino del easing | Estándar de GSAP, sin cargo (Webflow) |
| `vendor/ScrollTrigger.min.js` (45 KB) | El único trigger que sincroniza con `scrub` sin recalcular por listener | ídem |

Van **vendorizadas** a propósito: el proyecto no tiene build y se abre con
doble clic (`file://`), así que un CDN rompería el sitio sin conexión.
Ambas van con `defer`; si no cargan, la escena se queda estática.

**No se usa Lenis.** El scroll nativo con `scrub` da el mismo resultado y
evita tres problemas: secuestraría el scroll y chocaría con el
`window.scrollTo` del router y con `scroll-behavior:smooth`; añadiría un
`rAF` permanente; y engordaría el bundle. Si algún día lo quieres, el
puente son tres líneas y va al principio de `Scrolly.init()`:

```js
const lenis = new Lenis({ smoothWheel: true });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
```

**No se usa Three.js ni `<canvas>`**: para una ilustración de línea, el SVG
es más ligero, escala sin pérdida, se estilea con CSS y se difumina.
