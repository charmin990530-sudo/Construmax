# CONSTRUMAX — sitio de constructora

Sitio estático de una constructora en Bogotá. Diseño editorial con CSS propio
(sin frameworks, sin build). Se abre con doble clic en `index.html`.

## Estructura

```
index.html    Estructura y contenido de las 5 rutas
styles.css    Sistema de diseño: tokens, componentes, responsive, a11y
script.js     Router por hash, índice, fichas, formulario, widgets, escena de scroll
stage.js      Escena 3D del hero: motor propio sobre canvas 2D
vendor/       GSAP 3.15 y ScrollTrigger, minificados (licencia sin cargo)
tools/        Arnés de verificación (opcional, requiere Playwright)
```

## Las dos escenas de la portada

**El hero 3D construye el edificio.** Un motor propio sobre `<canvas>` 2D
levanta la Torre Chapinero Alto: grúa, andamio y veinticuatro pisos, con el
ratón se gira y con el teclado se recorren. Es una lámina de dibujo con
líneas de 1 px, como la de abajo.

**La lámina de scroll la sostiene.** La torre ya está entregada y lo que
cuenta es lo que le pasa en los diez años siguientes: el diagnóstico, la
plomada, la inspección, el andamio, la ocupación, la reparación y el sello
de garantía. Los paneles de texto viven en el flujo normal, así que se leen,
se navegan y se indexan igual, y sin JavaScript la escena se queda en su
versión estática con todo el contenido visible.

Cada escena tiene un oficio distinto a propósito: si las dos contaran la
misma historia, se leería como la misma película dos veces.

Cómo ajustarlas está en **[SCROLLYTELLING.md](SCROLLYTELLING.md)** (la de
scroll) y en **[STAGE.md](STAGE.md)** (la 3D).

## Rutas

| Ruta                 | Vista                                    |
|----------------------|------------------------------------------|
| `#/inicio`           | Portada                                  |
| `#/nosotros`         | Historia, pilares, cronología, equipo    |
| `#/proyectos`        | Catálogo con filtros                     |
| `#/proyecto/<id>`    | Ficha técnica de un proyecto             |
| `#/contacto`         | Formulario y datos de la sala de ventas  |

El router usa hash a propósito para que funcione con `file://` sin servidor.
En producción (Vercel) también funciona; si se migra a History API hay que
agregar reglas de reescritura.

## Datos

Los seis proyectos viven en el array `DATA` de `script.js`. Ahí se editan
nombre, categoría, estado, ubicación, precio, área, avance, amenidades y el
texto alternativo de la foto. El formulario es una maqueta: el envío real se
conecta en `Form.init()`.

## Despliegue en Vercel

Sitio estático, sin build. `vercel deploy` o conectar el repo en
vercel.com → New → Project → Other → Framework: Other. Output directory: `.`.

## Verificado

- Contraste WCAG AA en todos los pares de texto; el dibujo por encima de 1,4:1
- Navegación por teclado con focus trap en menús
- `prefers-reduced-motion` y `prefers-contrast` respetados
- La escena 3D aguanta 60 fps: 0,70 ms por fotograma en escritorio y
  3,50 ms en móvil con el CPU limitado ×4; sin CLS
- Las 16 imágenes (14 fotos distintas), todos los enlaces y las 5 rutas
  se conservan íntegros
- Con `tools/verificar.py`: las cinco rutas, las dos escenas, el teclado, el
  móvil, sin JavaScript, sin GSAP y con un navegador antiguo simulado
