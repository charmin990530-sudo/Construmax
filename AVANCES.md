# AVANCES

Estado del proyecto a **12 de noviembre de 2026**. Esto es para retomar el
trabajo: qué hay, qué se decidió, qué se rompió y qué queda.

## En una línea

Sitio estático de una constructora con un sistema editorial plano (papel,
tinta, un rojo de plano) y **dos escenas con oficios distintos**: la 3D del
hero, escrita con un motor propio sobre `<canvas>`, **construye** la torre;
la de scroll la **sostiene** durante los diez años siguientes. Sin
frameworks, sin build, sin dependencias.

**Desplegado:** https://construmax-murex.vercel.app
**Deploy:** `construmax/76JG8HQWuTrrMxKroECkJui245SF`
**Peso publicado:** 321 KB sin comprimir (con `stage.js`, que antes no se
cargaba; eran 269 KB).

## Estructura

```
index.html      5 rutas + la escena 3D del hero + la lámina de scroll
styles.css      sistema de diseño: tokens, componentes, responsive, a11y, impresión
script.js       router por hash, índice, fichas, formulario, widgets,
                escena de scroll, tema, cortina, inclinación
stage.js        motor 3D: proyección, obra, interacción, encuadre, fundido
vendor/         GSAP 3.15 + ScrollTrigger
README.md       sistema visual, rutas, datos, despliegue, métricas
STAGE.md        la escena 3D: motor, obra, encaje, tamaño, a11y, compatibilidad
SCROLLYTELLING.md  la escena de scroll
AVANCES.md      este archivo
CONTINUAR.md    el punto de partida inmediato
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
| 8 · auditoría | Se encontró lo que la documentación daba por hecho y no era cierto (ver abajo) |

## La auditoría del 12 de noviembre de 2026

El turno anterior dejó la documentación describiendo un trabajo que **no
estaba en el código**. La documentación iba tres pasos por delante de la
realidad, y eso hace que un proyecto que parece terminado no lo esté. Lo que
se encontró, y qué se hizo con ello:

| Lo que la documentación daba por hecho | Lo que había | Qué se hizo |
|---|---|---|
| La escena 3D del hero funcionando | **`stage.js` no estaba enlazado en `index.html`. Nunca lo estuvo, en todo el historial de git.** El motor, 978 líneas, no se cargaba | Se integró: marcado, estilos, cámara y `<script>` |
| La escena de scroll contando la vida de la torre | Contaba la construcción, con el foso, el acero y la grúa: exactamente la película repetida | Se reescribió el relato, el SVG, la línea de tiempo y el CSS |
| El arnés de verificación en verde | Comprobaba un **tema oscuro que no existe** (`#themeBtn`): se caía en el primer paso y no llegaba a comprobar nada | Arnés arreglado y ampliado (dos escenas, no una) |
| El respaldo de `dvh` detrás de `@supports` | **No había ningún `@supports` en el CSS.** Sin él, los siete paneles pierden el alto en Safari < 15.4 | Respaldo restaurado, con el razonamiento escrito al lado |
| Un fundido de 190 ms | El comentario decía 190 ms; el código era exponencial y tardaba **963 ms** | Fundido lineal de 220 ms, medido: 216 ms |
| Los botones con texto de papel | `--paper` es un **degradado** en el modo día, y un degradado no es un `<color>` válido: el texto de `.btn--ink` se quedaba sin valor | Tokens de superficie separados de los de color (`--paper-bg`) |
| Alternativas de foto que describían la foto | "Grúas en obra" en una foto sin grúas; "Bogotá" en un rascacielos de Estados Unidos; dos retratos con el género equivocado | Todas las `alt` dicen lo que se ve; el equipo se renombró para que coincida con sus fotos |

**La lección:** un documento que describe un trabajo no es el trabajo. Lo
que se comprueba es lo que existe.

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
    en el infinito: todo lo que pase de `cam.dist` se ve flotando.
11. **La torre era una pila de tortitas** sin columnas. Añadidas pilares,
    refuerzo y núcleo.
12. **La losa naranja flotaba** a 20 m del gancho. Ahora solo existe
    mientras va colgada de él.
13. **El encuadre estaba calculado para una lámina de 1 264 px** y la lámina
    vive en una columna de 400 px: la torre salía diminuta y las cotas se
    salían por la izquierda. Ahora la cámara se deriva del tamaño del
    lienzo (`CFG.fit`).
14. **Un degradado no es un color.** `--paper` es un `linear-gradient()` en el
    modo día, y `color: var(--paper)` es una declaración inválida: el texto
    de los botones se quedaba sin valor y la lámina de noche se quedaba con
    la tinta del día sobre un cielo negro, es decir, invisible. Separados
    `--paper` (color) y `--paper-bg` (superficie).

### La escena de scroll

15. **P0 · sin GSAP la escena era invisible.** `.st` y la marca de "la
    animación es dueña del dibujo" eran la misma clase, y `.st` la ponía el
    `<head>` siempre. Ahora son `.st` (layout), `.st-armed` (dibujo) y
    `.st-ready` (la escena ya está decidida).
16. **El HUD tapaba la base de la torre en móvil.** Ahora está arriba, en la
    banda del cielo.
17. **Fotos que mentían.** El hero decía "grúas en obra" y era un foso.
    Andrés Molina, gerente general, tenía la foto de una mujer. Plaza
    Salitre tenía el skyline de Nueva York.
18. **El router se desfasaba** del hash con cambios encadenados: `hashchange`
    se agrupa. Se relee el hash al intercambiar.
19. **La etapa 07 se apagaba** al final del recorrido en móvil. La línea de
    lectura se recortó al rango de los paneles.
20. **El thumbnail del formulario parecía no aceptar** un segundo envío.
    Falsa alarma: artefacto de Playwright, el sitio está bien.
21. **Ocultar un grupo y animar a sus hijos los deja invisibles.** El grupo
    se queda en 0 y los hijos no se ven nunca. En `.st-armed` se ocultan
    los hijos, nunca el padre.
22. **El sol y el sello se salían del encuadre.** La lámina no se ve entera:
    en escritorio el `slice` deja fuera unas 90 unidades por cada lado.
    Los elementos que tienen que verse están dentro de la franja.

### El resto del sitio

23. **El arnés comprobaba un tema que no existe.** El botón `#themeBtn` no
    está en el HTML, así que la comprobación de "las cinco rutas en los dos
    temas" moría en el primer paso y **nunca llegaba a comprobar la escena
    3D**. Por eso el motor sin enlazar pasó inadvertido.

---

## Decisiones que conviene no deshacer

- **El respaldo de CSS va en `@supports`, no en cascada.** Ver punto 5 y 6.
- **`rgba()` con caché.** Se llama una vez por primitiva y frame; sin caché
  eran 400 cadenas y 400 parseos de color por frame.
- **`P4`, un `Float64Array` de 8.** `paint()` creaba 2 000 arrays por frame.
- **Medir el rectángulo *mostrado* del canvas**, nunca el atributo `width`.
  Son los dos números que comparten dibujo y hit-test.
- **`pointer-events: none` en el póster**, siempre.
- **Búfer a 1,5× en pantallas estrechas.** Para líneas es indistinguible de
  2× y quita el 44 % de los píxeles.
- **El encuadre se deriva del lienzo, no se pone a ojo.** `CFG.fit` dice qué
  mundo tiene que verse; la distancia y las dos correcciones salen de ahí.
- **Ningún trazo por debajo de 1,4:1** sobre el papel de la lámina. Medido,
  no a ojo.

## Limitaciones conocidas

- **Las fotos son de sustitución.** Seis de las ocho no son de Bogotá ni de
  los proyectos que describen, y la del skyline es de Estados Unidos. Los
  `alt` ya no mienten —dicen lo que se ve— pero hace falta **fotografía
  propia**. *Es lo primero que arreglaría.*
- **Safari y Firefox sin verificar visualmente.** No se pueden instalar en
  esta máquina (faltan librerías del sistema, requieren sudo). Sí está
  comprobado que **no se rompe** neutralizando `dvh` y `color-mix()` en el
  navegador; no que se vea idéntico.
- **Las cifras de fps no son fiables.** La máquina llegó a carga 33 sobre 8
  núcleos. Lo fiable es el coste de dibujo: **0,70 ms/frame** en escritorio,
  **3,50 ms** en móvil con CPU ×4.
- **El CTA queda bajo el pliegue en móvil.** Decisión consciente: se ve el
  titular y la escena entera, el texto va debajo.
- **La escena 3D y la lámina de scroll cuentan la misma torre desde dos
  lados.** Es a propósito —una construye, la otra sostiene—, pero el riesgo
  de que se lean como la misma película está ahí. Conviene revisarlo con
  ojos de alguien que no sepa la historia.

## Qué queda por mejorar

Ordenado por lo que más rinde.

1. **Fotografía propia.** Bloquea el resto: mientras las fotos digan otra
   cosa que la que enseñan, ningún ajuste visual compensa.
2. **Safari y Firefox.** Ejecutar `tools/verificar.py` contra ellos en una
   máquina donde sí se puedan instalar. Sobre todo el `backdrop-filter` de la
   barra y los `dvh` con la barra de direcciones del móvil.
3. **Revisar el hero con los dos ojos.** La escena 3D acaba de integrarse en
   una columna estrecha y el encuadre se ha derivado del lienzo. Funciona y
   está medido, pero nunca se ha visto con alguien al lado.
4. **El andamio de la lámina** se lee todavía algo como una escalera. Con más
   cruces y menos plano se convenía mejor.

Hecho en este ciclo y ya no pendiente: el relato de la escena de scroll (la
torre ya está en pie: diagnóstico, plomada, inspección, andamio, ocupación,
reparación y garantía), la integración de la escena 3D del hero, el respaldo
de `dvh`, el fundido a 220 ms medidos, el contraste del dibujo medido y
subido al suelo de 1,4:1, los textos alternativos de todas las fotos, el
arnés de verificación arreglado y ampliado, y la limpieza de las reglas y
las variables que no usaba nadie.

## Cómo volver a verificar

El arnés está en `tools/verificar.py`. Necesita Playwright con Chromium; el
resto del sitio no tiene dependencias y se abre con doble clic.

```bash
python3 -m playwright install chromium          # una vez
python3 tools/verificar.py                      # ~3 min
python3 tools/verificar.py --degradado         # navegador antiguo
python3 tools/verificar.py --url https://construmax-murex.vercel.app
```

Comprueba: sintaxis, balance del HTML y el CSS, las cinco rutas, la escena de
scroll (siete etapas, contador sincronizado con el panel, instrumental que
aparece y desaparece), la escena 3D (que se pinta, responde al ratón y al
teclado, y se detiene fuera de pantalla), el móvil, el teclado, sin
JavaScript, con menos movimiento, sin GSAP y con un navegador antiguo
simulado.

**Para probar un navegador antiguo** sin tenerlo: interceptar `styles.css` y
renombrar `dvh` y `color-mix`. El módulo tiene `--degradado` para eso.

## Para desplegar

```bash
vercel deploy --prod --yes
```

`.vercelignore` corta `.env*` y `.git*`, así que el token OIDC de
`.env.local` no sube. Comprobado antes: `/.env.local` da 404 en producción.
