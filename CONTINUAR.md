# CONTINUAR

Estado al dejar el trabajo, **12 de noviembre de 2026**. Para retomar sin
volver a leer todo.

`AVANCES.md` es la memoria larga del proyecto (qué se decidió y por qué).
Este archivo es solo el punto de partida inmediato.

---

## 1. Lo primero: el estado del árbol

**Todo está commiteado** salvo los cambios de este turno. El árbol limpio
está en `a440da0`; este turno todavía no se ha hecho commit.

```
 M index.html  script.js  stage.js  styles.css  tools/verificar.py
 M AVANCES.md  CONTINUAR.md  README.md  SCROLLYTELLING.md  STAGE.md
```

**Antes de tocar nada:**

```bash
python3 -m playwright install chromium   # una vez
python3 tools/verificar.py               # ~3 min, 30 comprobaciones
```

Ahora el arnés **comprueba las dos escenas** y termina en `TODO CORRECTO`.
Si se toca el CSS o el SVG, hay que volver a pasarlo antes de commitear.

---

## 2. Lo que hizo este turno

Fue una **auditoría**, y encontró que la documentación iba tres pasos por
detrás del código. El detalle está en `AVANCES.md`, sección "La auditoría
del 12 de noviembre de 2026"; lo que hay que saber para seguir:

### 2.1 La escena 3D del hero no estaba conectada

`stage.js` (978 líneas, el motor documentado en `STAGE.md`) **no estaba
enlazado en `index.html`**, y no lo había estado nunca en todo el historial
de git. El sitio llevaba tiempo mostrando la foto del hero sin la escena
encima, y el arnés no lo detectó porque **comprobaba un tema oscuro que no
existe** (`#themeBtn`) y se moría en el primer paso.

**Hecho:** marcado del escenario, estilos, cámara adaptada a la columna
estrecha en la que vive, y el `<script>` puesto. La escena funciona, se
pinta, responde al ratón y al teclado, y se detiene fuera de pantalla.

**Ojo con dos cosas al tocarla:**

- **El encuadre ya no está en una tabla de formatos.** Sale de `CFG.fit`
  (qué mundo tiene que verse) y del tamaño del lienzo. Si se cambia el
  tamaño de la lámina, no hay que tocar la cámara: se ajusta sola.
- **La cámara orbita un punto a `ty` de alto**, así que el suelo se dibuja
  por debajo de `H * VY`. Hay una corrección para eso en `size()`. Si se
  cambia `ty`, esa corrección sigue valiendo; si se olvida, la base de la
  torre se sale de la lámina.

### 2.2 La escena de scroll cuenta otra historia

Ahora la torre **está entregada** y la escena cuenta lo que le pasa después:
diagnóstico, plomada, inspección, andamio, ocupación, reparación y garantía.
El hero 3D construye; la lámina sostiene. Ese reparto es deliberado y está
en `AVANCES.md`.

Reescritos: el SVG de la lámina (nuevos grupos `tw-mats`, `tw-plumb`,
`tw-read`, `tw-hoist`, `tw-fix`, `tw-seal`, `wk-off`; fuera el foso, el
acero, la placa, la grúa torre y la maquinaria), la línea de tiempo de
`script.js`, los paneles y los capítulos de `index.html`, y la sección 10
del CSS (que ahora se llama "ESCENA DE LA TORRE").

**Dos avisos de la casa:**

- **En `.st-armed` se ocultan los HIJOS, no el padre.** Si se oculta un
  grupo y la línea de tiempo anima a sus hijos, el grupo se queda en 0 y los
  hijos no se ven nunca. Ya pasó una vez.
- **La lámina no se ve entera.** En escritorio el `slice` deja fuera unas 90
  unidades por cada lado (x de 90 a 610), y en vertical solo se ve de la
  cota 225 hacia abajo. Los elementos que tienen que verse van dentro de
  esa franja; en móvil, las cotas y la leyenda se retiran porque sus
  rótulos de 9 px quedan en 4,5 px.

### 2.3 Cuatro bugs de fondo que no se habían visto

| Bug | Por qué importa |
|---|---|
| `--paper` es un degradado en el modo día, y un degradado no es un `<color>` válido | El texto de `.btn--ink` se quedaba sin valor (botón con texto oscuro sobre fondo oscuro) y la lámina de noche se quedaba con la tinta del día sobre el cielo negro: **el edificio era invisible** |
| No había ningún `@supports` en el CSS | El respaldo de `dvh` que da por hecho `STAGE.md` § 9 no existía: en Safari < 15.4 los siete paneles perdían el alto |
| El fundido no duraba 190 ms | Era exponencial con constante 5,2: 963 ms medidos. Ahora es lineal, 220 ms, medidos 216 ms |
| `P.ink2` se leía y no se usaba; `.hero__imgwrap`, `--paper-texture` y `--text-shadow` tampoco | Rutina de limpieza, nada más |

### 2.4 Contraste del dibujo

Medido, no a ojo: se lee el lienzo píxel a píxel, se compone cada trazo
sobre el fondo real y se calcula la razón de contraste. El suelo quedó en
**1,4:1** para ningún trazo visible; el de la lámina SVG, en **1,76:1**.
El cambio de fondo fue `st.faint()`: usaba el gris de marca y ahora usa
tinta.

### 2.5 Las fotos

Todas las `alt` dicen lo que se ve. Dos retratos no coincidían con su
nombre (un gerente general con foto de mujer, una arquitecta senior con
foto de hombre) y se renombraron a **Andrea Molina** y **Lucas Peña** para
que el retrato y la persona digan lo mismo.

Las fotos siguen siendo de sustitución: eso no se arregla sin fotografía
propia. Está en la lista de pendientes.

---

## 3. Lo que queda, por orden

1. **Fotografía propia.** Es lo primero que arreglaría una constructora de
   verdad y bloquea el resto.
2. **Safari y Firefox.** En una máquina donde se puedan instalar:
   `python3 tools/verificar.py` contra ellos. Sobre todo el
   `backdrop-filter` de la barra y los `dvh` con la barra de direcciones del
   móvil.
3. **Mirar el hero con dos ojos.** La escena 3D se integró en una columna
   estrecha y el encuadre se derivó del lienzo. Funciona y está medido, pero
   nunca se ha visto con alguien al lado.
4. **El andamio de la lámina** se lee todavía algo como una escalera.
5. **Revisar el commit.** Este turno no ha hecho commit.

---

## 4. Limitaciones que siguen ahí

- Las fotos (2.1 de arriba).
- Safari y Firefox sin verificar visualmente: comprobado que **no se
  rompe**, no que se vea idéntico.
- La escena 3D y la lámina de scroll cuentan la misma torre desde dos lados.
  Es a propósito, pero conviene revisarlo con alguien que no sepa la
  historia.
- El texto del formulario sigue siendo una maqueta: `Form.init()` es donde
  se enchufa el envío real.

## 5. Para desplegar

```bash
vercel deploy --prod --yes
```

`.vercelignore` corta `.env*` y `.git*`, así que el token OIDC de
`.env.local` no sube. Comprobado antes: `/.env.local` da 404 en producción.
