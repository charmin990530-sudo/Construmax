#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Arnés de verificación de CONSTRUMAX.

Comprueba, en un navegador real, lo que el sitio afirma. Sirve para lo
mismo antes y después de un cambio: si el número se mueve, es que el
cambio lo movió.

    pip install playwright && python -m playwright install chromium
    python3 tools/verificar.py
    python3 tools/verificar.py --url https://tu-sitio.vercel.app
    python3 tools/verificar.py --degradado     # simula un navegador antiguo

OPCIONAL. El sitio no tiene dependencias ni build y se abre con doble
clic; esto solo hace falta para trabajar sobre él.

Qué mide y qué NO:

  · mide que no se rompe, con números y estados observables
  · NO mide cómo se ve. Los porcentajes de fotogramas dependen de la
    disponibilidad de la máquina, no del sitio: mide el equipo. Para el
    coste de dibujo de la escena 3D, mira STAGE.md § 10, que está medido
    en milisegundos por fotograma dentro de la propia función.
"""

import argparse
import pathlib
import re
import subprocess
import sys
import threading
import functools
import http.server
import socketserver

ROOT = pathlib.Path(__file__).resolve().parent.parent

ROUTES = ['#/inicio', '#/nosotros', '#/proyectos',
          '#/proyecto/chapinero-alto', '#/contacto']

# Funciones modernas que no están en todos los navegadores. Renombrarlas
# es una forma fiel de simular un navegador que no las soporta. Ver
# STAGE.md § 9: el respaldo tiene que estar en @supports, y esto es lo
# que lo demuestra.
MODERNAS = [('dvh', 'dvhZZ'), ('color-mix', 'no-mix')]


class Quieto(http.server.SimpleHTTPRequestHandler):
    """Sirve el proyecto sin escribir un log por petición."""
    def log_message(self, *a):
        pass


def servidor():
    srv = socketserver.TCPServer(
        ('127.0.0.1', 0), functools.partial(Quieto, directory=str(ROOT)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, srv.server_address[1]


def seccion(titulo):
    print('\n' + titulo)
    print('-' * len(titulo))


def ok(b):
    return 'OK   ' if b else 'FALLA'


def revisar_sintaxis():
    seccion('1. Sintaxis y estructura')
    fallos = 0
    for f in ('script.js', 'stage.js'):
        r = subprocess.run(['node', '--check', f], cwd=ROOT, capture_output=True)
        print(f'   {f:12} {ok(r.returncode == 0)}')
        fallos += 0 if r.returncode == 0 else 1

    css = (ROOT / 'styles.css').read_text(encoding='utf-8')
    limpio = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    balanceado = limpio.count('{') == limpio.count('}')
    print(f'   styles.css  llaves {ok(balanceado)}')
    fallos += 0 if balanceado else 1

    # Caracteres fuera del proyecto: se colaron varias veces al escribir
    # los comentarios y no se ven en el navegador.
    raro = re.compile('[\u4e00-\u9fff\u3040-\u30ff]')
    sucios = [f.name for f in ROOT.glob('*')
              if f.suffix in ('.js', '.css', '.html', '.md')
              and raro.search(f.read_text(encoding='utf-8', errors='ignore'))]
    print(f'   sin caracteres fuera {ok(not sucios)} {sucios or ""}')
    fallos += 0 if not sucios else 1
    return fallos


def comprobar_rutas(pw, url, tema):
    ctx = pw.chromium.launch().new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page()
    errores = []
    pg.on('pageerror', lambda e: errores.append(str(e)[:70]))
    pg.goto(url)
    pg.wait_for_timeout(2500)
    if tema == 'dark':
        pg.click('#themeBtn')
        pg.wait_for_timeout(800)
    for r in ROUTES:
        pg.evaluate(f'location.hash="{r}"')
        pg.wait_for_timeout(850)
        n = pg.evaluate(
            '()=>[...document.querySelectorAll(".page")].filter(p=>!p.hidden).length')
        if n != 1:
            errores.append(f'{r} deja {n} paginas visibles')
    print(f'   {tema:6} una pagina por ruta y sin errores  '
          f'{ok(not errores)} {errores[:2]}')
    ctx.close()
    return 0 if not errores else 1


def comprobar_interaccion(pw, url):
    ctx = pw.chromium.launch().new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page()
    fallos = 0
    pg.goto(url)
    pg.wait_for_timeout(2500)

    viva = pg.evaluate(
        '()=>document.getElementById("heroStage").classList.contains("is-live")')
    print(f'   escena viva                {ok(viva)}')
    fallos += 0 if viva else 1

    pg.click('[data-stage-play]')
    pg.wait_for_timeout(250)
    pg.focus('#heroStage')
    for _ in range(4):
        pg.keyboard.press('Enter')
        pg.wait_for_timeout(90)
    sel = pg.evaluate('()=>document.querySelector("[data-stage-read]").textContent')
    print(f'   teclado elige piso          {ok("+" in sel)}')
    fallos += 0 if '+' in sel else 1

    box = pg.locator('#stage').bounding_box()
    pg.mouse.move(box['x'] + box['width'] * 0.60, box['y'] + box['height'] * 0.62)
    pg.wait_for_timeout(280)
    cursor = pg.evaluate('()=>document.getElementById("stage").style.cursor')
    print(f'   cursor sobre la torre      {ok(cursor == "pointer")}')
    fallos += 0 if cursor == 'pointer' else 1

    pg.mouse.click(box['x'] + box['width'] * 0.60, box['y'] + box['height'] * 0.62)
    pg.wait_for_timeout(320)
    clic = pg.evaluate('()=>document.querySelector("[data-stage-read]").textContent')
    print(f'   clic elige piso            {ok("+" in clic)}')
    fallos += 0 if '+' in clic else 1

    # Un arrastre no debe borrar la seleccion
    antes = clic
    pg.mouse.move(box['x'] + box['width'] * 0.6, box['y'] + box['height'] * 0.5)
    pg.mouse.down()
    for i in range(12):
        pg.mouse.move(box['x'] + box['width'] * 0.6 - i * 16,
                      box['y'] + box['height'] * 0.5)
    pg.mouse.up()
    pg.wait_for_timeout(300)
    igual = pg.evaluate('()=>document.querySelector("[data-stage-read]").textContent') == antes
    print(f'   arrastrar no borra         {ok(igual)}')
    fallos += 0 if igual else 1

    pg.keyboard.press('Escape')
    pg.wait_for_timeout(220)
    limpio = '+' not in pg.evaluate('()=>document.querySelector("[data-stage-read]").textContent')
    print(f'   Escape limpia               {ok(limpio)}')
    fallos += 0 if limpio else 1
    ctx.close()
    return fallos


def comprobar_degradaciones(pw, url):
    fallos = 0
    ctx = pw.chromium.launch().new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page()
    pg.goto(url)
    pg.wait_for_timeout(2000)
    # Fuera de pantalla la escena debe dejar de dibujar
    pg.evaluate('window.scrollTo(0,6000)')
    pg.wait_for_timeout(900)
    pg.evaluate('window.scrollTo(0,0)')
    pg.wait_for_timeout(900)
    viva = pg.evaluate(
        '()=>document.getElementById("heroStage").classList.contains("is-live")')
    print(f'   vuelve a dibujar al subir   {ok(viva)}')
    fallos += 0 if viva else 1
    ctx.close()

    ctx = pw.chromium.launch().new_context(viewport={'width': 1440, 'height': 900},
                                          java_script_enabled=False)
    pg = ctx.new_page()
    pg.goto(url)
    pg.wait_for_timeout(1000)
    poster = pg.locator('.hero__poster').is_visible()
    print(f'   sin JS: se ve el poster    {ok(poster)}')
    fallos += 0 if poster else 1
    ctx.close()

    ctx = pw.chromium.launch().new_context(viewport={'width': 1440, 'height': 900},
                                          reduced_motion='reduce')
    pg = ctx.new_page()
    pg.goto(url)
    pg.wait_for_timeout(1800)
    viva = pg.evaluate(
        '()=>document.getElementById("heroStage").classList.contains("is-live")')
    sin_boton = pg.locator('[data-stage-play]').count() == 0
    pg.focus('#heroStage')
    pg.keyboard.press('Enter')
    pg.wait_for_timeout(300)
    repinta = '+' in pg.evaluate('()=>document.querySelector("[data-stage-read]").textContent')
    print(f'   menos mov: escena viva     {ok(viva)}')
    print(f'   menos mov: sin boton inútil {ok(sin_boton)}')
    print(f'   menos mov: teclado repinta {ok(repinta)}')
    fallos += 0 if (viva and sin_boton and repinta) else 1
    ctx.close()
    return fallos


def comprobar_movil(pw, url):
    fallos = 0
    ctx = pw.chromium.launch().new_context(**pw.devices['iPhone 13'])
    pg = ctx.new_page()
    errores = []
    pg.on('pageerror', lambda e: errores.append(str(e)[:70]))
    pg.goto(url)
    pg.wait_for_timeout(3000)
    desb = pg.evaluate('document.documentElement.scrollWidth') > pg.evaluate('innerWidth')
    print(f'   sin desbordamiento          {ok(not desb)}')
    print(f'   sin errores                 {ok(not errores)} {errores[:1]}')
    fallos += 0 if (not desb and not errores) else 1
    ctx.close()
    return fallos


def comprobar_tabulacion(pw, url):
    """La escena tiene que aparecer en el recorrido de tabulacion.

    No se comprueba que sea el elemento ACTIVO tras N tabs: hay mas
    elementos tabulables que tabs y con eso el elemento activo ya ha
    pasado de largo. Lo que importa es que aparezca alguna vez."""
    ctx = pw.chromium.launch().new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page()
    pg.goto(url)
    pg.wait_for_timeout(2200)
    visto = False
    for _ in range(24):
        pg.keyboard.press('Tab')
        pg.wait_for_timeout(55)
        if pg.evaluate('()=>document.activeElement && document.activeElement.id === "heroStage"'):
            visto = True
            break
    print(f'   la escena es tabulable     {ok(visto)}')
    ctx.close()
    return 0 if visto else 1


def comprobar_degradado(pw, url):
    """Simula un navegador sin dvh ni color-mix. Ver STAGE.md § 9."""
    seccion('7. Navegador antiguo (dvh y color-mix neutralizados)')
    original = (ROOT / 'styles.css').read_text(encoding='utf-8')
    cuerpo = original
    for moderno, sustituto in MODERNAS:
        cuerpo = cuerpo.replace(moderno, sustituto)
    ctx = pw.chromium.launch().new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page()
    pg.route('**/styles.css',
             lambda r: r.fulfill(status=200, body=cuerpo, content_type='text/css'))
    pg.goto(url)
    pg.wait_for_timeout(2600)
    g = pg.evaluate("""()=>{const cs=getComputedStyle(document.documentElement);
      const p=document.querySelector('#scenePanels .panel');
      return {panelH: cs.getPropertyValue('--panel-h').trim(),
        panelMinH: p?getComputedStyle(p).minHeight:null,
        nav: getComputedStyle(document.querySelector('.nav')).backgroundColor,
        navTransparente: getComputedStyle(document.querySelector('.nav')).backgroundColor
          === 'rgba(0, 0, 0, 0)'};}""")
    print(f"   --panel-h cae a vh          {ok(g['panelH'] == '100vh')} ({g['panelH']})")
    print(f"   los paneles conservan alto   {ok(g['panelMinH'] not in (None, 'auto'))} "
          f"({g['panelMinH']})")
    print(f"   la barra conserva velo      {ok(not g['navTransparente'])}")
    fallos = 0 if (g['panelH'] == '100vh' and not g['navTransparente']
                   and g['panelMinH'] not in (None, 'auto')) else 1
    ctx.close()
    return fallos


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', help='comprobar contra una URL en vez de servir en local')
    ap.add_argument('--degradado', action='store_true',
                    help='añade la prueba de navegador antiguo')
    args = ap.parse_args()

    srv, port = servidor()
    local = f'http://127.0.0.1:{port}/index.html'
    url = args.url or local

    print('CONSTRUMAX — verificación')
    print(f'Destino: {url}')
    fallos = revisar_sintaxis()

    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        seccion('2. Las cinco rutas, en los dos temas')
        for tema in ('light', 'dark'):
            fallos += comprobar_rutas(pw, url, tema)

        seccion('3. La escena 3D responde')
        fallos += comprobar_interaccion(pw, url)

        seccion('4. Degradaciones')
        fallos += comprobar_degradaciones(pw, url)

        seccion('5. Móvil')
        fallos += comprobar_movil(pw, url)

        seccion('6. Teclado')
        fallos += comprobar_tabulacion(pw, url)

        if args.degradado:
            fallos += comprobar_degradado(pw, url)

    srv.shutdown()
    print('\n' + '=' * 46)
    if fallos:
        print(f'FALLAN {fallos} COMPROBACIONES — no dar esto por bueno')
    else:
        print('TODO CORRECTO')
    print('=' * 46)
    return 1 if fallos else 0


if __name__ == '__main__':
    sys.exit(main())