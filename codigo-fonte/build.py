"""Monta o index.html do QAR (um único arquivo, publicado pelo GitHub Pages).

Uso, dentro da pasta codigo-fonte:
    npm install            (só na primeira vez: instala o Firebase e o esbuild)
    python build.py        -> gera ../index.html

O esbuild junta app/*.js (e o Firebase) num único módulo; este script embute esse
módulo e o CSS no index.html.
"""
import pathlib, shutil, subprocess, sys

R = pathlib.Path(__file__).parent
ler = lambda nome: (R / nome).read_text(encoding='utf-8')

npx = shutil.which('npx') or shutil.which('npx.cmd')
if not npx:
    sys.exit('Instale o Node.js (https://nodejs.org) e rode "npm install" nesta pasta.')
r = subprocess.run([npx, '--no-install', 'esbuild', 'app/app.js', '--bundle', '--format=esm', '--minify',
                    '--target=es2022', '--legal-comments=none', '--log-level=warning'],
                   cwd=R, capture_output=True, text=True, encoding='utf-8')
if r.returncode:
    sys.exit('esbuild falhou:\n' + r.stderr + '\n(Rodou "npm install"?)')

partes = {'/*APP_CSS*/': ler('estilo.css'), '/*APP_JS*/': r.stdout}
t = ler('index.html')
for k, v in partes.items():
    assert k in t, k
    t = t.replace(k, v.replace('</script', '<\\/script').replace('</style', '<\\/style'))
saida = R.parent / 'index.html'
saida.write_text(t, encoding='utf-8', newline='\n')
print(saida, f'{len(t) / 1024:.0f} KB')
