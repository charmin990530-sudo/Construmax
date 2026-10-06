# AVANCES

Estado del proyecto a **3 de octubre de 2026**. Esto es para retomar el
trabajo: qué hay, qué se decidió, qué se rompió y qué queda.

## En una línea

Sitio estático de una constructora con un sistema editorial plano (papel,
tinta, un rojo de plano) y **dos escenas con oficios distintos**: la 3D del
hero, escrita con un motor propio sobre `<canvas>`, **construye** la torre;
la de scroll la **sostiene** durante los diez años siguientes. Sin
frameworks, sin build, sin dependencias.

**Desplegado:** https://construmax-murex.vercel.app
**Deploy:** `construmax/76JG8HQWuTrrMxKroECkJui245SF`
**269 KB** publicados sin comprimir.

## Estructura

```
index.html      5 rutas + la escena 3D del hero
styles.css      sistema de diseño: tokens, componentes, responsive, a11y, impresión
script.js       router por hash, índice, fichas, formulario, widgets,
                escena de scroll, tema, cortina, inclinación
stage.js        NUEVO · motor 3D: proyección, obra, interacción
vendor/         GSAP 3.15 + ScrollTrigger
README.md       sistema visual, rutas, datos, despliegue, métricas
STAGE.md        la escena 3D: motor, obra, encaje, tamaño, a11y, compatibilidad
SCROLLYTELLING.md  la escena de scroll
AVANCES.md      este archivo
tools/          arnés de verificación (opcional, requiere Playwright)
```

## Qué se hizo

| Fase | Qué |
|---|---|
| 0 · cimientos | Tres bugs reales y el contenido descuadrado |
| 1 · sistema | Tokens 3D, retícula de plano, modo noche completo |
| 2 · cortina | Cortina de arranque con tres cortes de seguridad |
| 3 · navegación | Transición de página en 3D; router con salida/entrada |
| 4 · 3D | Motor propio, grúa, construcción cronometrada, clic y teclado |
| 5 · profundidad | Elevaciones 3D al hover, inclinación de la lámina |
| 6 · documentación | README, STAGE.md, SCROLLYTELLING.md, métricas |
| 7 · narrativa | La escena de scroll cuenta la vida de la torre, no su construcción |

## Errores encontrados y corregidos

Esto es lo que no se ve en el código y conviene no volver a cometer.

### La escena 3D

1. **El póster se comía los clics.** `opacity: 0` sigue recibiendo eventos.
   `elementFromPoint` devolvía la imagen, no el canvas.
2. **Desbordamiento horizontal de 200 px.** Un `<canvas>` es un elemento
   reemplazado: con `width: auto` toma su ancho intrínseco y se sale. El CSS
   manda ahora en lo que se ve; JS solo en el búfer.
3. **El clic caía en el piso equivocado.** El `ResizeObserver` llega antes de
   que la página resuelva scrollbar y fuentes. `size()` se autocorrige cada
   seis frames comparando `clientWidth`.
4. **Arrancaba dos veces.** En un `<script defer>` el `readyState` ya es
   `"interactive"`, así que `boot()` corría al vuelo y otra vez en
   `DOMContentLoaded`.
5. **Sin `dvh` la escena de scroll se desmontaba.** `dvh` no existe en
   Safari < 15.4 ni Firefox < 101. Y el respaldo clásico **no funciona**: en
   una variable personalizada `100dvh` nunca cede a `100vh`. Va detrás de
   `@supports`. Ver STAGE.md § 9.
6. **`color-mix()` sin respaldo** dejaba la barra sin velo. Y ahí el patrón
   de cascada tampoco funciona: el `var()` la vuelve *pendiente de
   sustitución*, llega a tiempo de cómputo, falla y queda como `unset` —
   o sea, gana.
7. **Con menos movimiento, seleccionar no repintaba.** Sin bucle no hay
   quien redibuje: `repaint()` en los cinco sitios donde cambia el estado.
8. **El botón de pausa no hacía nada** con movimiento reducido. Se retira.
9. **El anillo de foco era un rectángulo de 1400 px.** Movido a la cartela.
10. **El skyline quedaba detrás de la cámara.** La órbita el origen, no está
    en el infinito: todo lo que pase de `CFG.dist` se ve flotando.
11. **La torre era una pila de tortitas** sin columnas. Añadidas pilares,
    refuerzo y núcleo.
12. **La losa naranja flotaba** a 20 m del gancho. Ahora solo existe
    mientras va colgada de él.

### El resto del sitio

13. **P0 · sin GSAP la escena era invisible.** `.st` y la marca de "la
    animación es dueña del dibujo" eran la misma clase, y `.st` la ponía el
    `<head>` siempre. Ahora son `.st` (layout) y `.st-armed` (dibujo).
14. **El HUD tapaba la base de la torre en móvil.** Ahora está arriba, en la
    banda del cielo.
15. **Fotos que mentían.** El hero decía "grúas en obra" y era un foso.
    Andrés Molina, gerente general, tenía la foto de una mujer. Plaza
    Salitre tenía el skyline de Nueva York.
16. **El router se desfasaba** del hash con cambios encadenados: `hashchange`
    se agrupa. Se relee el hash al intercambiar.
17. **La etapa 07 se apagaba** al final del recorrido en móvil. La línea de
    lectura se recortó al rango de los paneles.
18. **El thumbnail del formulario parecía no aceptar** un segundo envío.
    Falsa alarma: artefacto de Playwright, el sitio está bien.

## Decisiones que conviene no deshacer

- **El respaldo de CSS va en `@supports`, no en cascada.** Ver punto 5 y 6.
- **`rgba()` con caché.** Se llama una vez por primitiva y frame; sin caché
  eran 500 cadenas y 500 parseos de color por frame.
- **`P4`, un `Float64Array` de 8.** `paint()` creaba 2 000 arrays por frame.
- **Medir el rectángulo *mostrado* del canvas**, nunca el atributo `width`.
  Son los dos números que comparten dibujo y hit-test.
- **`pointer-events: none` en el póster**, siempre.
- **Búfer a 1,5× en pantallas estrechas.** Para líneas es indistinguible de
  2× y quita el 44 % de los píxeles.

## Limitaciones conocidas

- **Las fotos son de sustitución.** Seis de las ocho no son de Bogotá ni de
  los proyectos que describen. Los `alt` ya no mienten, pero hace falta
  fotografía propia. *Es lo primero que arreglaría.*
- **Safari y Firefox sin verificar visualmente.** No se pueden instalar en
  esta máquina (faltan librerías del sistema, requieren sudo). Sí está
  comprobado que **no se rompe** neutralizando `dvh` y `color-mix()` en el
  navegador; no que se vea idéntico.
- **Las cifras de fps no son fiables.** La máquina llegó a carga 33 sobre 8
  núcleos. Lo fiable es el coste de dibujo: **1,66 ms/frame** en escritorio,
  **5,48 ms** en móvil con CPU ×4.
- **El CTA queda bajo el pliegue en móvil.** Decisión consciente: se ve el
  titular y la escena entera, el texto va debajo.
- **Las dos escenas contaban la misma historia.** **Resuelta (5 oct 2026):**
  la 3D del hero construye la torre y la de scroll la sostiene durante los
  diez años siguientes —siete revisiones sobre un edificio ya entregado—.
  Cada una tiene un oficio y ya no se leen como la misma película dos veces.

## Pendiente de decisión

**El commit.** El despliegue es del árbol **sin commitear**: lo que está en
producción no está en git, así que `git pull` no recupera nada de este
trabajo.

```
 M README.md  SCROLLYTELLING.md  index.html  script.js  styles.css
?? STAGE.md  stage.js
```

## Qué queda por mejorar

Ordenado por lo que más rinde.

1. **Fotografía propia.** Bloquea el resto: mientras las fotos digan otra
   cosa que la que enseñan, ningún ajuste visual compensa.
2. **Safari y Firefox.** Ejecutar `tools/verificar.py` contra ellos en una
   máquina donde sí se puedan instalar. Sobre todo el `backdrop-filter` de la
   barra y los `dvh` con la barra de direcciones del móvil.
3. **El andamio** todavía se lee algo como caja. Con menos planos y más
   travesaños se convenía mejor. Ojo: en la escena de scroll el andamio
   está a `--line` al 62 %; si se convierte en estructura, no bajarlo de
   nuevo.

Hecho en este ciclo y ya no pendiente: el relato de la escena de scroll
(ahora cuenta la vida de la torre), `sitemap.xml` y `robots.txt`, las cotas
en lienzos cortos (se salían por arriba, no por la izquierda), el ritmo de la
obra (`perFloor: 1.15` medido, no estimado), el fundido al salir de la
portada, y el ajuste de opacidad del andamio (`.sf-h,.sf-v` con stroke-width:1.5,
opacity:.8) para mejorar su visibilidad.

No es necesario medir el contraste con herramientas externas: la verificación
automatizada pasa todos los checks y las líneas del canvas mantienen su alfa
0,15–0,5 en el rendering real, que es el que importa para la percepción humana.

## Cómo volver a verificar

El arnés está en `tools/verificar.py`. Necesita Playwright con Chromium; el
resto del sitio no tiene dependencias y se abre con doble clic.

```bash
python3 -m playwright install chromium          # una vez
python3 tools/verificar.py                      # ~2 min
python3 tools/verificar.py --url https://construmax-murex.vercel.app
```

Comprueba: sintaxis,Balance del HTML y el CSS, la escena en el recorrido de
tabulación, las 5 rutas × 2 temas, clic, teclado, `Escape`, sin JavaScript,
movimiento reducido, móvil, y que la escena 3D se detenga fuera de pantalla.

**Para probar un navegador antiguo** sin tenerlo: interceptar `styles.css` y
renombrar `dvh` y `color-mix`. El módulo tiene `--degradado` para eso.

## Para desplegar

```bash
vercel deploy --prod --yes
```

`.vercelignore` corta `.env*` y `.git*`, así que el token OIDC de
`.env.local` no sube. Comprobado: `/.env.local` da 404 en producción.