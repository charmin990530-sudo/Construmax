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


def comprobar_rutas(pw, url):
    """Las cinco rutas: una visible cada vez y sin errores de JavaScript."""
    ctx = pw.chromium.launch().new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page()
    errores = []
    pg.on('pageerror', lambda e: errores.append(str(e)[:70]))
    pg.goto(url)
    pg.wait_for_timeout(2500)
    for r in ROUTES:
        pg.evaluate(f'location.hash="{r}"')
        pg.wait_for_timeout(850)
        n = pg.evaluate(
            '()=>[...document.querySelectorAll(".page")].filter(p=>!p.hidden).length')
        if n != 1:
            errores.append(f'{r} deja {n} paginas visibles')
    print('   una pagina por ruta y sin errores  '
          f'{ok(not errores)} {errores[:2]}')
    ctx.close()
    return 0 if not errores else 1


def comprobar_escena(pw, url):
    """La escena de la torre: siete etapas, y el contador de la cartela
    tiene que coincidir con el panel que se está leyendo."""
    ctx = pw.chromium.launch().new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page()
    errores = []
    pg.on('pageerror', lambda e: errores.append(str(e)[:70]))
    pg.goto(url)
    pg.wait_for_timeout(2200)
    fallos = 0

    armado = pg.evaluate('document.documentElement.classList.contains("st-armed")')
    print('   la lamina esta armada        ' + ok(armado))
    fallos += 0 if armado else 1

    paneles = pg.evaluate('document.querySelectorAll("#scenePanels .panel").length')
    print('   siete paneles                ' + ok(paneles == 7))
    fallos += 0 if paneles == 7 else 1

    capitulos = pg.evaluate('document.querySelectorAll(".scene__chapters button").length')
    print('   siete capitulos              ' + ok(capitulos == 7))
    fallos += 0 if capitulos == 7 else 1

    # Se recorre la escena y se comprueba que el rotulo sigue al panel.
    sincronizado = True
    vistos = set()
    for i in range(7):
        pg.evaluate("""(i)=>{const p=document.querySelectorAll("#scenePanels .panel")[i];
            const r=p.getBoundingClientRect();
            window.scrollTo(0, window.scrollY+r.top+r.height/2-innerHeight/2);}""", i)
        pg.wait_for_timeout(700)
        d = pg.evaluate("""()=>({num:document.getElementById("stageNum").textContent,
            name:document.getElementById("stageName").textContent})""")
        vistos.add(d['name'])
        if d['num'] != '%02d' % (i + 1):
            sincronizado = False
    print('   el contador va con el panel  ' + ok(sincronizado))
    print('   siete etapas distintas       ' + ok(len(vistos) == 7))
    fallos += 0 if (sincronizado and len(vistos) == 7) else 1

    # El instrumental aparece y desaparece con el scroll.
    opacidad = """()=>{const q=s=>{const e=document.querySelector(s);
        return e?parseFloat(getComputedStyle(e).opacity):-1;};
        return {dims:q('.tw-dims'), scaf:q('.tw-scaf'), seal:q('.tw-seal')};}"""
    pg.evaluate('window.scrollTo(0,0)')
    pg.wait_for_timeout(1400)
    alPrincipio = pg.evaluate(opacidad)
    pg.evaluate("""()=>{const p=document.querySelectorAll("#scenePanels .panel")[6];
        const r=p.getBoundingClientRect();
        window.scrollTo(0, window.scrollY+r.top+r.height/2-innerHeight/2);}""")
    pg.wait_for_timeout(1600)
    alFinal = pg.evaluate(opacidad)
    bien = (alPrincipio['dims'] < 0.05 and alPrincipio['seal'] < 0.05
            and alFinal['dims'] > 0.85 and alFinal['seal'] > 0.85)
    print('   el instrumental va con el scroll ' + ok(bien))
    fallos += 0 if bien else 1

    print('   sin errores                   ' + ok(not errores) + ' ' + str(errores[:2]))
    fallos += 0 if not errores else 1
    ctx.close()
    return fallos


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

    # El lienzo tiene que tener algo dibujado: un lienzo en blanco es
    # una escena que no arranca, aunque la clase is-live este puesta.
    pintado = pg.evaluate("""()=>{const c=document.getElementById("stage");
        const d=c.getContext("2d").getImageData(0,0,c.width,c.height).data;
        let s=0; for(let i=3;i<d.length;i+=4) s+=d[i];
        return s/(d.length/4);}""")
    print(f'   el lienzo esta dibujado     {ok(pintado > 1)} (alfa medio {pintado:.2f})')
    fallos += 0 if pintado > 1 else 1

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
    seccion('8. Navegador antiguo (dvh y color-mix neutralizados)')
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
        seccion('2. Las cinco rutas')
        fallos += comprobar_rutas(pw, url)

        seccion('3. La escena de la torre')
        fallos += comprobar_escena(pw, url)

        seccion('4. La escena 3D responde')
        fallos += comprobar_interaccion(pw, url)

        seccion('5. Degradaciones')
        fallos += comprobar_degradaciones(pw, url)

        seccion('6. Móvil')
        fallos += comprobar_movil(pw, url)

        seccion('7. Teclado')
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