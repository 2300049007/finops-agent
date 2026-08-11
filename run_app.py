import os
import sys
import time
import threading
import webbrowser
import http.server
import socketserver

# Add current folder to sys.path
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
sys.path.append(DIRECTORY)

# Fix Windows terminal UTF-8 encoding
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Config
BACKEND_PORT = 8000
FRONTEND_PORT = 8080

def run_backend():
    """Starts the FastAPI backend service on port 8000."""
    try:
        import uvicorn
        from backend.app.main import app
        print(f"[Backend] Starting FastAPI service on http://localhost:{BACKEND_PORT}...")
        uvicorn.run(app, host="0.0.0.0", port=BACKEND_PORT, log_level="info")
    except ImportError:
        # Fallback if uvicorn is not installed globally
        print(f"[Backend] uvicorn not found in global env. Starting lightweight backend listener...")
        from http.server import HTTPServer, SimpleHTTPRequestHandler
        server = HTTPServer(("0.0.0.0", BACKEND_PORT), SimpleHTTPRequestHandler)
        server.serve_forever()

def run_frontend():
    """Starts static web server on port 8080."""
    os.chdir(DIRECTORY)
    socketserver.TCPServer.allow_reuse_address = True
    
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=DIRECTORY, **kwargs)
            
    try:
        with socketserver.TCPServer(("", FRONTEND_PORT), Handler) as httpd:
            print(f"[Frontend] Starting FinOps Console UI on http://localhost:{FRONTEND_PORT}...")
            httpd.serve_forever()
    except Exception as e:
        print(f"Frontend server error: {e}")

def seed_data_if_needed():
    """Seeds DB policies and accounts on initial boot."""
    try:
        print("[Setup] Running initial database seed and policy ingestion...")
        from scripts.load_policies import main as load_pols
        from scripts.seed_db import main as seed_dbs
        load_pols()
        seed_dbs()
        print("[Setup] Data seeding complete!")
    except Exception as e:
        print(f"[Setup] Data initialization notice: {e}")

def open_browser():
    """Opens browser automatically after 1.5 seconds."""
    time.sleep(1.5)
    print(f"[System] Opening FinOps Console UI at http://localhost:{FRONTEND_PORT}...")
    webbrowser.open(f"http://localhost:{FRONTEND_PORT}")

if __name__ == "__main__":
    print("=" * 60)
    print("  AI Financial Operations (FinOps) Agent - System Launcher  ")
    print("  iOS 26 Glossy UI & Stateful Multi-Agent Engine v1.2       ")
    print("=" * 60)

    # 1. Run Data Seeding
    seed_data_if_needed()

    # 2. Launch Backend in background thread
    backend_thread = threading.Thread(target=run_backend, daemon=True)
    backend_thread.start()

    # 3. Launch Browser timer
    threading.Thread(target=open_browser, daemon=True).start()

    # 4. Launch Frontend web server (main thread)
    try:
        run_frontend()
    except KeyboardInterrupt:
        print("\n👋 Shutting down FinOps Agent Console servers. Goodbye!")
        sys.exit(0)
