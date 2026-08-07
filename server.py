import http.server
import socketserver
import webbrowser
import threading
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def open_browser():
    webbrowser.open(f"http://localhost:{PORT}")

if __name__ == "__main__":
    print(f"Loading local FinOps Console files from: {DIRECTORY}")
    
    # Change working directory to ensure correct path resolution
    os.chdir(DIRECTORY)
    
    # Allow port reuse to avoid 'Address already in use' errors
    socketserver.TCPServer.allow_reuse_address = True
    
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            print(f"Web server started successfully at http://localhost:{PORT}")
            print("Press Ctrl+C to terminate the server.")
            
            # Start browser launch timer (delaying 1 second to ensure server is active)
            threading.Timer(1.0, open_browser).start()
            
            httpd.serve_forever()
    except Exception as e:
        print(f"Error starting server: {e}", file=sys.stderr)
        sys.exit(1)
