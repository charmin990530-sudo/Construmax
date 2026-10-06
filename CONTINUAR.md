# CONTINUAR

Estado al dejar el trabajo, **5 de octubre de 2026**. Para retomar sin
volver a leer todo.

`AVANCES.md` es la memoria larga del proyecto (qué se decidió y por qué).
Este archivo es solo el punto de partida inmediato.

---

## 1. Lo primero: el estado del árbol

**Nada de esto está commiteado.** Sigue el aviso de `AVANCES.md`:

```
 M README.md  SCROLLYTELLING.md  index.html  script.js  styles.css  stage.js
 ?? AVANCES.md  STAGE.md  stage.js  tools/  CONTINUAR.md
```

`stage.js` y `tools/` son archivos sin seguimiento y `git pull` no
recuperaría nada de este trabajo. Hay **un commit pendiente de hacer**, y
es lo primero que conviene hacer antes de tocar nada más:

```bash
git add -A && git commit -m "feat(portada): la escena de scroll cuenta la vida de la torre, no su construcción"
```

No se ha hecho porque no se pidió.

### Verificación antes de tocar nada

```bash
python3 -m playwright install chromium   # una vez
python3 tools/verificar.py               # ~2 min, 24 comprobaciones
```

Al dejar esto, **los dos JS parsean** (`node --check stage.js` y
`node --check script.js` pasan) y el SVG de la escena es XML válido. El
arnés completo se pasó **antes** de los cambios de la sección 3; después
de ellos solo se verificó la escena de scroll y la escena 3D por separado.
**Vuelve a correr `verificar.py` antes de commitear.**

---

## 2. La revisión que se pidió, y qué se hizo con ella

Confirmado que el proyecto es **HTML + CSS + JS puros, sin frameworks, sin
backend y sin build**: no hay `package.json` ni lockfile ni config de
bundler; los cuatro `<script>` son uno inline de 15 líneas en el `<head>` y
`gsap` / `ScrollTrigger` / `stage.js` / `script.js` con `defer`; no hay
ningún `fetch`, `XMLHttpRequest` ni `WebSocket` (lo único persistente es
`localStorage` para el tema, y `script.js:1305` es el único rastro de
backend: un comentario). Lo único externo son Google Fonts y fotos de
Unsplash. Los dos únicos `url()` del CSS son SVG en `data:`.

De los siete items pendientes:

| Item | Estado |
|---|---|
| Cambiar el relato de la escena de scroll | **Hecho** |
| Ritmo de la construcción | **Medido; se queda 1,15** |
| Cotas en lienzos cortos | **Hecho** (el diagnóstico estaba equivocado) |
| Fundido al salir de la portada | **Hecho, sin verificar la duración** |
| Contraste del dibujo | No empezado |
| Andamio con más travesaños | No empezado |
| `sitemap.xml` y `robots.txt` | **Hecho** (4 rutas canónicas) |

---

## 3. Lo hecho, y lo que hay que revisar de cada parte

### 3.1 La escena de scroll ahora cuenta la vida de la torre

**Por qué.** El hero 3D y la escena de scroll levantaban la misma torre con
la misma secuencia, y se leían como la misma película dos veces. Ahora cada
una tiene un oficio: **el hero 3D construye el edificio; la escena de
scroll lo sostiene durante los diez años siguientes.**

| # | Antes (construcción) | Ahora (revisión) | Qué hace el dibujo |
|---|---|---|---|
| 01 | Terreno | Diagnóstico | entran las cotas de nivel |
| 02 | Excavación | Plomada | la plomada se inclina y vuelve |
| 03 | Cimientos | Inspección | cinco casillas rojas suben por las cotas |
| 04 | Estructura | Andamio | sube el andamio y el hoist |
| 05 | Envolvente | Ocupación | se encienden las ventanas al anochecer |
| 06 | Acabados | Reparación | se abre un paño, entra vidrio nuevo |
| 07 | Entrega | Garantía | noche y sello de garantía estructural |

Consecuencia de diseño: **el edificio ya no se construye en el SVG.** Se
borraron el foso, el acero, la placa de fundación, la grúa torre y la
retroexcavadora (`index.html`, grupos `tw-pit`, `tw-rebar`, `tw-found`,
`tw-crane`, `wk-exc`, `wk-trk`) y el patrón `px-soil`, que quedó sin uso.
Se añadieron `tw-plumb`, `tw-read`, `tw-fix`, `tw-seal`, `tw-hoist`,
`tw-mats` y `wk-off`. La grúa se sustituyó por un hoist de obra.

**Clase a favour: el estado inicial cambió de raíz.** Antes `.st-armed`
ocultaba los 56 pisos; ahora no, porque el edificio se entrega en pie.
Oculta el instrumental (cotas, plomada, casillas, caseta, andamio, hoist,
grietas, paño nuevo, sello). Si en `.st-armed` se oculta un **grupo** pero
la línea de tiempo anima a sus **hijos**, el grupo se queda en 0 y los hijos
no se ven nunca. Ya pasó una vez: `.tw-read` estaba en la lista de ocultos
y las casillas nunca aparecieron. Oculta los hijos, no el padre.

Comprobado: los siete paneles salen en su revisión, el contador del HUD
coincide con el panel que se está leyendo, y el SVG es XML válido. Los
elementos que antes quedaban fuera del encuadre se corrigieron midiendo el
`getBBox()` real contra la banda visible del `slice`: el sello se sale por
la derecha y el sol también.

### 3.2 Ritmo: `perFloor` se queda en 1,15

Medido, no estimado (24 pisos − 9 prebuilt = 15 ciclos):

| `perFloor` | Obra completa | Gesto "carga y coloca" | Fotogramas de quietud |
|---|---|---|---|
| 0,8 | 11,4 s | 144 ms = 8,6 f | 13/59 |
| **1,15** | **16,9 s** | **207 ms = 12,4 f** | 16/59 |
| 1,8 | 26,5 s | 324 ms = 19,4 f | 26/59 |

El ciclo de la grúa tiene cuatro fases sobre `work.phase`. Por debajo de
unos 8 fotogramas un gesto deja de leerse como gesto, así que 0,8 está en el
borde y 1,8 se pasa de lento: 26,5 s de los cuales la grúa está quieta la
mitad. **1,15 no se cambió**; lo que cambia es que ahora está justificado con
números en vez de por costumbre.

Aviso para el que siga: **el giro de la grúa converge con constante fija
(0,625 s), no proporcional al ciclo** (`stage.js`, `stepCrane()`). Si se
baja `perFloor` mucho, la grúa no llega nunca a su sitio.

### 3.3 Cotas: el diagnóstico de `AVANCES.md` estaba equivocado

Decía "a 820 px el rótulo `+93.1` se sale del lienzo". **Se sale por ARRIBA,
no por la izquierda.** Medido interceptando `fillText`:

| Lienzo | Cotas | `+93.1` en y |
|---|---|---|
| 1408×736 (escritorio) | 4/4 | 144,8 — dentro |
| 781×398 (corto) | 3/4 | −24 a −36 — **fuera por arriba** |
| 348×270 (móvil) | 4/4 | 27,2 — dentro |

La primera versión del arreglo comprobaba el ancho con `measureText` y
**nunca disparaba**: el hueco de la torre es generoso incluso en móvil. La
versión buena proyecta el punto real y mira **los dos ejes**, con 4 px de
margen (`stage.js`, `dims()`). Se conserva siempre `+0.0` —sin él la torre
pierde la referencia del suelo— y con él baja el último nivel que quepa.

### 3.4 Fundido de la escena 3D: hecho, **sin verificar la duración**

Al salir de pantalla el dibujo se cortaba en seco. Ahora hay un fundido
corto: `fade` global multiplicado en `rgba()` (`stage.js`), con su propio
bucle `fadeLoop()` a `FADE_RATE = 5.2` (unos 190 ms), enganchado al
`IntersectionObserver` y al `visibilitychange`.

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
**siempre** que `fade === 1`, nunca solo cuando el bucle principal está
parado. Al volver a entrar corren los dos bucles a la vez, y con la
condición de "si no hay `raf`" la clase se quedaba puesta con el lienzo ya
opaco: invisible.

**Lo que falta comprobar:** que el fundido dure de verdad ~190 ms. El
alfa medio del lienzo es de 3,2 sobre 255 (es un dibujo de líneas con
mucho transparente), así que hay que medir con el parche de
`/tmp/opencode/fade3.py`, que expone `window.__fade` e itera con `rAF`
dentro de la página en vez de con round-trips de Playwright — con
round-trips el muestreo es demasiado grueso para 190 ms. Ese script falló
por un `PATCH` mal construido; la idea es válida, el código no.

---

## 4. Lo que queda, por orden

### 4.1 `sitemap.xml` y `robots.txt` — **hechos** (6 oct 2026)

Creados en la raíz. El sitemap lleva **cuatro** entradas canónicas:
la raíz (la portada —`#/inicio` es la misma página y el
`<link canonical>` apunta a `/`), `#/nosotros`, `#/proyectos` y
`#/contacto`. Las fichas `#/proyecto/<id>` quedaron fuera a propósito:
rutas hash que casi ningún crawler indexa, y fingir 10 páginas
indexables no suma. `robots.txt` es mínimo: `Allow: /` + el puntero
al sitemap. XML validado con `xml.dom.minidom`. `.vercelignore` no
los corta, así que se despliegan con `vercel deploy`.

### 4.2 Contraste del dibujo

Las líneas del canvas van a alfa 0,15–0,5. No es texto, así que el AA no
aplica, pero `AVANCES.md` propone medirlo con un verificador real en vez de
al ojo. Todos los alfas están en los estilos de `st` (`stage.js:271-276`) y
en la sección 10 de `styles.css`.

### 4.3 El andamio

Se lee algo como caja. La propuesta de `AVANCES.md` —menos planos y más
travesaños— sigue siendo buena. Ojo: **en la escena de scroll el andamio
lo acabas de subir a `--line` al 62 %** porque a `--sil` al 45 % se perdía
contra los paños de la torre. Si lo conviertes en estructura, no lo bajes de
nuevo.

### 4.4 Las fotos

Sigue siendo lo primero que arreglaría una constructora de verdad y bloquea
el resto: seis de las ocho son de sustitución. Los `alt` ya no mienten.

---

## 5. Lo que hay que actualizar antes de cerrar el turno — **hecho** (6 oct 2026)

**La documentación ya describe el relato viejo.** `SCROLLYTELLING.md` es lo
peor: §1 tiene la tabla de las siete etapas de construcción, el párrafo del
concepto habla de grúa torre y foso con canastas, y §6 documenta clases SVG
que ya no existen (`.tw-pit`, `.tw-rebar`, `.tw-found`, `.tw-crane`, y el
generador de ~200 líneas que el sitio ya no usa). El `README.md` también
dice que la portada "se construye con el scroll, del terreno a la entrega,
en siete etapas". `AVANCES.md` tiene la limitación "las dos escenas cuentan
la misma historia" **resuelta ahora**, y su lista de pendientes está
desactualizada.

Cambios mínimos:

- `SCROLLYTELLING.md`: §1 completo, la tabla de `CFG.stages`, la tabla de
  clases SVG de §6 y las referencias a la grúa y al foso.
- `README.md`: el párrafo "La escena de la portada".
- `AVANCES.md`: marcar la limitación de las dos escenas como resuelta,
  añadir el cambio de relato a "Qué se hizo", y reemplazar la lista de
  pendientes.
- `STAGE.md`: el apartado de las cotas, si documenta los cuatro niveles.

Hecho el 6 de octubre de 2026: `SCROLLYTELLING.md` (§1, tabla de
`CFG.stages`, §6 sin clases muertas ni generador), `README.md` (párrafo de
la portada y fila `.st-armed`), `AVANCES.md` (limitación resuelta, fase 7
añadida, pendientes reemplazados) y `styles.css` (sección 10 renombrada a
"ESCENA DE LA TORRE", comentario de `.st-armed` y lista de
`prefers-reduced-motion` actualizadas —esta última aún referenciaba
`.tw-pit`/`.tw-rebar`/`.tw-found`/`.tw-crane` y dejaba fuera el instrumental
nuevo). `STAGE.md` no necesitaba cambios: no documenta los valores de
`CFG.levels`.

---

## 6. Limitaciones que siguen ahí

- **Safari y Firefox sin verificar visualmente.** No se pueden instalar en
  esta máquina. Sí está comprobado que el sitio *no se rompe*
  neutralizando `dvh` y `color-mix()` en el navegador
  (`tools/verificar.py --degradado`), no que se vea idéntico.
- **El commit sigue pendiente** (sección 1).
- **Las fotos** (sección 4.4).
- **La duración del fundido sin verificar** (sección 3.4).

## 7. Para desplegar

```bash
vercel deploy --prod --yes
```

`.vercelignore` corta `.env*` y `.git*`, así que el token OIDC de
`.env.local` no sube. Comprobado antes: `/.env.local` da 404 en producción.
