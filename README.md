# CONSTRUMAX — sitio de constructora

Sitio estático de una constructora en Bogotá. Diseño editorial con CSS propio
(sin frameworks, sin build). Se abre con doble clic en `index.html`.

## Estructura

```
index.html    Estructura y contenido de las 5 rutas
styles.css    Sistema de diseño: tokens, componentes, responsive, a11y
script.js     Router por hash, índice, fichas, formulario, widgets
```

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
nombre, categoría, estado, ubicación, precio, área, avance y amenidades.
El formulario es una maqueta: el envío real se conecta en `Form.init()`.

## Despliegue en Vercel

Sitio estático, sin build. `vercel deploy` o conectar el repo en
vercel.comNew → Project → Other → Framework: Other. Output directory: `.`.

## Verificado

- Contraste WCAG AA en todos los pares de texto
- Navegación por teclado con focus trap en menús
- `prefers-reduced-motion` y `prefers-contrast` respetados
