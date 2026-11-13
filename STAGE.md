# STAGE — la escena 3D de la portada

La portada abre un edificio construyéndose solo con grúa, en 3D, que se gira
con el ratón y responde al clic. Todo está en **`stage.js`**, que es un motor
propio sobre `<canvas>` 2D.

No es Three.js, ni WebGL, ni un `.splinecode` de nadie. Son unas 400
primitivas dibujadas a mano en 0,7 ms por fotograma.

---

## 1. Por qué no WebGL ni Three.js

Porque el sistema visual del sitio es plano y de líneas —papel, tinta, un
rojo de plano— y un render PBR con HDRI y bloom se leería **pegado encima**
de la página. Con líneas de un píxel el 3D nace hablando el mismo idioma que
la lámina SVG que hay más abajo, y es lo que hace que los dos se lean como
una sola idea.

Además hay razones prácticas:

| | WebGL / Three.js | Canvas 2D con proyección propia |
|---|---|---|
| Peso | 150 KB – 3 MB | 30 KB |
| Sin GPU | se cae | cae al rasterizador por software y sigue |
| Estilo | obliga a PBR | líneas, al plano |
| Build | hay que vendorizarlo o usar CDN | nada |
| `file://` | el runtime del viewer no funciona | funciona |

---

## 2. El motor

Son cuatro ideas y ninguna más:

1. **Proyección.** `toCam()` gira el mundo alrededor de un punto a `cam.ty`
   de alto, y `screen()` divide por la profundidad. Es una cámara orbital
   clásica; no hay matrices porque no hay objetos que girar.

2. **Descarte de caras traseras.** En `quad()`, la normal de la cara en
   espacio de cámara se enfrenta al origen de cámara: si apunta al lado
   contrario, la cara no se dibuja. Una caja pasa de seis caras a tres.

3. **Orden del pintor.** Todas las primitivas se meten en `prims[]`, se
   ordenan por profundidad y se pintan de lejos a cerca. No hay z-buffer; para
   una escena de líneas, painter + backface culling es exactamente lo que
   hace falta.

4. **Reutilizar buffers.** `P4` es un `Float64Array` de ocho posiciones que
   se rellena in situ. Antes `paint()` creaba 2 000 arrays por frame.

### Paleta

Los colores se leen de los tokens del CSS (`--ink`, `--ink-3`, `--accent`)
con `getComputedStyle`. No hay sistema de temas, así que la paleta se lee una
sola vez al arrancar.

`rgba()` tiene una **caché**. Se llama una vez por primitiva y fotograma —
unas cuatrocientas—, y sin caché eran cuatrocientas cadenas nuevas y
cuatrocientos parseos de color en cada fotograma. En móvil con la CPU ×4 eso
costaba la mitad del presupuesto de fotograma.

Las opacidades del código son literales, así que la caché tiene unas pocas
entradas y no crece.

---

## 3. La obra

Todo sale de `CFG`, al principio del módulo. Una unidad del mundo es un metro.

| Campo | Qué es |
|---|---|
| `floors: 24` | plantas |
| `fh: 3.6` | altura de piso |
| `tower: 22` | lado de la planta |
| `podium` | el podio comercial de la base |
| `crane` | posición, altura, pluma y contrapeso de la grúa |
| `prebuilt: 9` | pisos que ya están levantados al empezar |
| `perFloor: 1.15` | segundos por piso |
| `slew` | a qué puntos va la grúa a buscar cada losa |
| `ty: 34` | altura del punto que orbita la cámara |
| `fit` | el mundo que tiene que verse (ver § 5) |
| `cartela: 52` | la franja de abajo que ocupa la cartela |
| `levels` | las cotas que se rotulan |

### El ciclo de un piso

`stepCrane()` es el reloj de la obra, y solo hay uno:

```
0,00 – 0,16   el gancho baja hasta el piso siguiente
0,16 – 0,34   sube con la losa encima
0,34 – 0,52   la deja en su sitio
0,52 – 1,00   se retira vacío mientras la grúa se coloca para la siguiente
```

La losa en camino **solo existe mientras va colgada del gancho**. Antes se
dibujaba el piso siguiente en el sitio, y se veía una losa naranja flotando a
veinte metros del gancho: un descuadre, no una losa.

Al terminar las 24 plantas se encienden las ventanas de abajo arriba, una de
cada siete en rojo de plano.

### Las columnas

Una torre de hormigón no es una pila de losas: son losas **y** columnas. Sin
`frame()` el dibujo se leía como una pila de tortitas; con los cuatro
pilares de esquina, su refuerzo cada cuatro plantas y el núcleo de
circulación en el centro, ya se lee como un edificio en obra.

---

## 4. Interacción

### Ratón

- **Arrastrar** gira: azimut y cabeceo, con límites en `CFG.orbit`.
- **Clic** selecciona el piso que hay debajo, si el puntero no se movió más
  de cinco píxeles (si no, un clic al final de un arrastre borraría la
  selección).
- **Pasar por encima** pone el cursor a `pointer` cuando hay piso debajo.

`hit()` prueba las seis caras proyectadas de cada piso levantado y se queda
con la más cercana que contenga el puntero.

### Teclado

El escenario es un `role="group"` con `tabindex="0"`, así que la escena
funciona entera sin ratón.

| Tecla | |
|---|---|
| flechas | girar |
| `Inicio` | volver a la vista de partida |
| `Intro` / `Espacio` | recorrer los pisos |
| `Escape` | borrar la selección |
| `R` | reiniciar la obra |
| `G` | pausar y reanudar |

Lo que pasa se anuncia por `#stageLive`, que es un `aria-live="polite"`.

---

## 5. El encuadre

**La cámara no se pone a ojo: sale del tamaño del lienzo.** La lámina vive
en una columna estrecha del hero, de unos 400 px, y su proporción cambia
entre escritorio, tableta y móvil. Lo único que hay que decidir es **cuánto
mundo tiene que verse**, y eso está en `CFG.fit`:

```js
fit: { x0: -56, x1: 44, y0: -8, y1: 96 }
```

De `-56` (las cifras de las cotas) a `+44` (la grúa), y de `-8` (el suelo por
debajo de la calle) a `96` (la coronación). Con eso:

```js
const esc = Math.min((W - 2*m) / (x1 - x0), utilH / (y1 - y0));
cam.dist = cam.f / esc - CFG.ty * sin(cam.el);
```

La distancia sale de la escala, y `VY` y `shift` salen de dos correcciones
que importan:

- **El origen del mundo no se dibuja donde se pone.** La cámara orbita un
  punto a `ty` de alto, así que el suelo sale por debajo de `H * VY`. Sin
  corregirlo, la base de la torre se va de la lámina.
- **El contenido se centra, no el origen.** Las cotas ocupan más sitio a la
  izquierda que la grúa a la derecha, así que el eje de la torre va a la
  derecha del centro.

### La franja de la cartela

La cartela (el contador de piso y el botón) ocupa los 52 px de abajo: el
dibujo nunca entra ahí. Por eso `CFG.cartela` está en el encuadre y no solo
en el CSS.

### La cámara orbita el origen, no está en el infinito

Todo lo que se ponga más lejos de lo que marca `cam.dist` aparece por detrás
del observador y se ve como cajas flotando en el aire —que es exactamente lo
que pasó con el skyline a la primera versión—. Las distancias tienen que
estar dentro del cilindro de visión, y por eso el barrio va a 27–58 m.

---

## 6. Tamaño del canvas

El tamaño mostrado lo manda el CSS (`width:100%; height:100%`); JavaScript
solo toca el búfer de píxeles. Es una división importante:

- Un `<canvas>` es un **elemento reemplazado**: con `width:auto` no se estira
  como un div, toma su ancho intrínseco —el atributo `width`— y se sale de la
  página.
- Si el búfer y lo que se ve no coinciden, el dibujo sale comprimido y el
  clic cae en el piso equivocado.

`W` y `H` se miden del **rectángulo mostrado** del canvas, porque son la
única medida que comparten el dibujo y el hit-test.

Y `size()` **se autocorrige**: cada seis fotogramas compara `clientWidth` con
`W` y vuelve a medir si no cuadran. El `ResizeObserver` no basta: llega antes
de que la página resuelva la barra de desplazamiento y las fuentes, y si te
quedas con esa medida el clic deja de funcionar.

En pantallas estrechas el búfer sube a 1,5 en vez de 2. Para una escena de
líneas es indistinguible y quita el 44 % de los píxeles que hay que rellenar.

Además, `size()` **recalcula el encuadre** cada vez que se llama, así que
el motor también oye el `resize` de la ventana: el lienzo puede no cambiar
de ancho (está en una columna de ancho fijo) y, aun así, cambiar de formato.

---

## 7. El póster

La foto del hero **no se quita nunca**: está debajo del lienzo y baja a
`opacity: 0` cuando ya hay un fotograma dibujado. Y lleva
`pointer-events: none` siempre —va después del canvas en el DOM y se pinta
encima, y un elemento transparente **sigue recibiendo clics**: sin eso el
ratón pasa por encima de una imagen invisible y la torre deja de responder.

Con todo esto, en estos casos lo que se ve es la foto y no hay ningún hueco:

- sin JavaScript
- sin soporte de `<canvas>`
- con `prefers-reduced-motion` (un fotograma con la torre terminada)
- si el navegador se queda sin contexto

### El fundido

Al salir de pantalla el dibujo se cortaba en seco. Ahora hay un fundido
corto: el alfa global multiplicado en `rgba()`, con su propio bucle
`fadeLoop()` a `FADE_MS = 220`, enganchado al `IntersectionObserver` y al
`visibilitychange`.

**El fundido dura lo que dice.** Antes era exponencial con constante 5,2 y
eso **no** eran 190 ms de un extremo a otro: la constante es el tiempo en el
que se recorre el 63 %, así que el fundido tardaba un segundo en terminar.
Medido con rAF dentro de la página: 963 ms reales. Ahora es lineal y dura
220 ms; medido otra vez: **216 ms** (la diferencia es el muestreo de 60 fps).

Tres cosas que costaron un bug cada una:

1. **La caché de `rgba()` es la que hace viable esto.** Sin cuantizar el
   alfa a 32 pasos serían ~600 cadenas nuevas por segundo solo del fundido,
   que es justo lo que la caché existe para evitar. El coste es 32 ×
   colores ≈ 600 entradas, y se puede vaciar en el cambio de paleta.
2. **Los objetivos del fundido son 0 y 1 a propósito.** El póster sigue
   debajo, y con el lienzo transparente se ve igual de bien, así que solo
   hay que pintar los intermedios.
3. **El lienzo no debe cambiar de `opacity`.** La transición CSS de
   `--t-slow` (0,72 s) competía con los 190 ms del alfa por píxel y el
   resultado real era un fundido lento. Ahora `is-live` mantiene
   `opacity:1` y la transición CSS solo sirve para el reveal inicial. Como
   el póster está **debajo** del lienzo (`z-index` 0 contra 1), el
   desvanecimiento es un fundido cruzado; por eso el póster sube en 190 ms
   y no en `--t-slow`, que si no dejarían medio segundo de hueco.

Bug que sigue vivo si se toca `fadeLoop()`: `is-fading` se quita
**siempre** que el fundido llega a 1, nunca solo cuando el bucle principal
está parado. Al volver a entrar corren los dos bucles a la vez, y con la
condición de "si no hay `raf`" la clase se quedaba puesta con el lienzo ya
opaco: invisible.

---

## 8. Cuándo se dibuja

Tres cortes, porque una escena que dibuja sola es una escena que gasta
batería:

- **Fuera de pantalla**: `IntersectionObserver`. La portada es la página más
  larga del sitio y esta escena puede quedar siete pantallas abajo.
- **En segundo plano**: `visibilitychange`.
- **Redimensionado**: solo se vuelve a pintar, el reloj de la obra no se
  reinicia.

---

## 9. Compatibilidad

El motor no usa nada que sea exótico: ni `?.`, `??`, `flat()` ni
`globalThis`: solo `Array.from`, `padStart`, `Map`, `ResizeObserver`,
`IntersectionObserver` y canvas 2D. Se puede ver en `script.js` y `stage.js`
con un grep.

En el CSS hay dos cosas que **no** están en todas partes, y su respaldo está
detrás de `@supports` en lugar de ser una cascada:

| Qué | Desde | Qué pasa sin respaldo |
|---|---|---|
| `dvh` | Safari 15.4, Firefox 101 | sin él, `--panel-h` se queda sin valor y los siete paneles de la escena de scroll pierden su alto |
| `color-mix()` | Safari 16.2, Firefox 113 | sin él, la barra de navegación se queda sin velo y el contenido se lee por debajo al hacer scroll |

El respaldo clásico —declarar dos veces y que la segunda sea la mejora— **no
funciona** en ninguno de los dos casos, y es un error fácil de cometer:

- En una **variable personalizada**, `--panel-h: 100dvh` no es "una
  declaración inválida" cuando la unidad no se conoce: las variables validan
  el flujo de tokens, no las unidades. Las dos declaraciones son válidas y
  gana la última, así que el respaldo nunca se ve.
- En `background: color-mix(... var(...))`, el `var()` la convierte en
  declaración *pendiente de sustitución*: no se descarta al parsear como
  haría una función desconocida, llega a tiempo de cómputo, falla ahí y queda
  como `unset` — o sea, **gana**.

Cómo se comprueba, sin tener esos navegadores: interceptar `styles.css` y
servirlo con `dvh` y `color-mix` renombrados. Un navegador que no soporta una
unidad o una función la trata exactamente como eso.

```python
pg.route('**/styles.css', lambda r: r.fulfill(
    status=200, body=ORIG.replace('dvh','dvhZZ').replace('color-mix','no-mix'),
    content_type='text/css'))
```

Con eso se comprueba que `--panel-h` cae a `100vh`, el panel sigue midiendo lo
mismo, la barra conserva su velo y las siete etapas se recorren igual.

---

## 10. Rendimiento

Coste de `build() + paint()` medido en el propio código:

| | ms por fotograma (mediana) | p95 | primitivas |
|---|---|---|---|
| Escritorio 1440×900 | **0,70** | 1,10 | 394 |
| Móvil 390×844 con CPU ×4 | **3,50** | 6,40 | 391 |

Lo que lo sostiene, y que conviene no deshacer sin motivo:

- `rgba()` con caché
- `P4` en vez de arrays nuevos por vértice
- backface culling en `quad()`, antes de encolar
- el barrio y el andamio solo con aristas, sin relleno
- celosía de la grúa cada 7,5 m en vez de cada 5
- en móvil, búfer a 1,5×
- la escena no se dibuja si no se ve

---

## 11. Contraste del dibujo

Las líneas del canvas no son texto, así que el WCAG no les aplica, pero un
trazo que no se ve no es un trazo. El suelo se puso **medido**, no a ojo: se
lee el lienzo pixel a pixel, se compone cada trazo sobre el fondo real de
la lámina (`#E9E6DD`) y se calcula la razón de contraste.

| | Antes | Ahora |
|---|---|---|
| Trazo más flojo (núcleo) | 1,27:1 | **1,55:1** (p5) |
| Mediana | 1,91:1 | **2,18:1** |
| Por debajo de 1,40:1 | 12 % | **0,2 %** |

El cambio de fondo fue uno solo y afecta a todos los trazos tenues:
`st.faint()` usaba `--ink-3` (gris de marca) y ahora usa tinta. Con el gris
al 26 % de alfa el trazo quedaba en 1,35:1 —no se veía—; con la misma
tinta al mismo alfa, 1,75:1. La regla que quedó:

> Ningún trazo visible por debajo de 1,4:1 sobre el papel de la lámina; los
> estructurales, por encima de 3:1.

La lámina SVG de la escena de scroll se midió con el mismo criterio: su
trazo más flojo está en 1,76:1 y ninguno baja de 1,40:1.

---

## 12. Si quieres cambiarla

| Quiero… | Dónde |
|---|---|
| Otra torre | `CFG.floors`, `fh`, `tower`, `podium` |
| Que la grúa llegue a otro sitio | `CFG.crane` y `CFG.slew` |
| Más o menos rápido | `CFG.perFloor` |
| Que empiece más construida | `CFG.prebuilt` |
| Otro encuadre | `CFG.fit` (qué mundo se ve) |
| Otros colores | los tokens; el código no lleva ninguno |
| Quitar la escena | borra `.hero__stage` del HTML y el `<script src="stage.js">`. La foto sigue ahí |

Si borras el `<script>`, el póster nunca baja de `opacity: .5` y se queda con
su filtro: el bloque está preparado para ese caso en `.hero__stage:not(.is-live)`.
