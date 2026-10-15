"""Lokaler Test-Server ohne Browser-Cache.  Start:  python tools/devserver.py [port]
Im WLAN erreichbar (z. B. vom iPhone) über http://<PC-IP>:<port>"""
import http.server, os, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
bind = sys.argv[2] if len(sys.argv) > 2 else "0.0.0.0"
print(f"Scherenschlacht läuft auf http://localhost:{port}")
http.server.ThreadingHTTPServer((bind, port), NoCache).serve_forever()
