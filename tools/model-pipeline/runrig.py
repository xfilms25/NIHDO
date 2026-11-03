import json,sys,base64
from playwright.sync_api import sync_playwright
import http.server,threading,functools
h=functools.partial(http.server.SimpleHTTPRequestHandler,directory='/home/claude/assets');h.log_message=lambda *a:None
srv=http.server.ThreadingHTTPServer(('127.0.0.1',8791),h);threading.Thread(target=srv.serve_forever,daemon=True).start()
jobs=[tuple(x.split(':')[:2])+(float(x.split(':')[2]),) for x in sys.argv[1:]]
with sync_playwright() as p:
  b=p.chromium.launch(args=['--use-gl=swiftshader','--enable-unsafe-swiftshader'])
  for src,ref,H in jobs:
    pg=b.new_page();pg.goto('http://127.0.0.1:8791/autorig.html?src=newc/%s.glb&ref=newc/%s.glb&h=%s'%(src,ref,H));pg.wait_for_function('window.DONE',timeout=600000)
    d=pg.evaluate('window.INFO');g=d.pop('glb',None);print(src,{k:d[k] for k in ('k1','k-1','far','N','badW') if k in d},d.get('err','')[:300],flush=True)
    if g:open('newc/%s_rig.glb'%src,'wb').write(base64.b64decode(g))
    pg.close()
  b.close()
