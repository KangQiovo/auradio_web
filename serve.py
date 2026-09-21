"""Dependency-free, local-only preview. Python 3.8+. Serves dist, never project source."""
import argparse
import mimetypes
from pathlib import Path
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote
import webbrowser
ROOT = Path(__file__).resolve().parent / 'dist'
PREFIX = '/auradio_web/'
mimetypes.add_type('text/javascript', '.js')
mimetypes.add_type('image/svg+xml', '.svg')
class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_): pass
    def do_POST(self): self.send_error(405)
    def do_HEAD(self): self.do_GET()
    def do_GET(self):
        if not re.fullmatch(r'(127\.0\.0\.1|localhost)(:\d+)?', self.headers.get('Host','')):
            self.send_error(403); return
        path=unquote(self.path.split('?')[0])
        if path in ('/', '/auradio_web'):
            self.send_response(302); self.send_header('Location', PREFIX); self.end_headers(); return
        parts=path[len(PREFIX):].split('/')
        if not path.startswith(PREFIX) or '\\' in path or '\0' in path or any(p.startswith('.') for p in parts):
            self.send_error(404); return
        file=ROOT.joinpath(*parts).resolve()
        try: file.relative_to(ROOT.resolve())
        except ValueError: self.send_error(404); return
        if file.is_dir():
            if not path.endswith('/'):
                self.send_response(302);self.send_header('Location',path+'/');self.end_headers();return
            file=file/'index.html'
        status=200
        if not file.is_file(): file=ROOT/'404.html';status=404
        if not file.is_file(): self.send_error(404);return
        size=file.stat().st_size;start=0;end=size-1
        value=self.headers.get('Range') if status==200 else None
        if value:
            m=re.fullmatch(r'bytes=(\d*)-(\d*)', value)
            valid=bool(m and (m[1] or m[2]))
            if valid:
                start=int(m[1]) if m[1] else max(0,size-int(m[2]))
                end=min(size-1,int(m[2])) if m[1] and m[2] else size-1
                valid=0<=start<=end<size
            if not valid:
                self.send_response(416);self.send_header('Content-Range',f'bytes */{size}');self.end_headers();return
            status=206
        self.send_response(status)
        self.send_header('Content-Type', mimetypes.guess_type(str(file))[0] or 'application/octet-stream')
        self.send_header('Content-Length',str(max(0,end-start+1)))
        self.send_header('Accept-Ranges','bytes');self.send_header('X-Content-Type-Options','nosniff');self.send_header('Cache-Control','no-store')
        if status==206:self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
        self.end_headers()
        if self.command=='HEAD':return
        try:
            with file.open('rb') as f:
                f.seek(start);remaining=end-start+1
                while remaining>0:
                    data=f.read(min(65536,remaining))
                    if not data:break
                    self.wfile.write(data);remaining-=len(data)
        except (BrokenPipeError,ConnectionResetError):pass
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=4173);p.add_argument('--open',action='store_true');args=p.parse_args()
    server=None
    for port in range(args.port,args.port+11):
        try:server=ThreadingHTTPServer(('127.0.0.1',port),Handler);break
        except OSError:continue
    if server is None:raise SystemExit('Ports busy. Retry with --port 4200.')
    url=f'http://127.0.0.1:{server.server_port}{PREFIX}'
    print(f'Auradio website: {url}\nLocal preview. Keep this window open. Ctrl+C to stop.',flush=True)
    if args.open:webbrowser.open(url)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()
