import http.server
import socketserver
import os
import sys

# Default port
PORT = 3000
DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build')

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

if __name__ == "__main__":
    # Check if build directory exists
    if not os.path.exists(DIRECTORY):
        print(f"Error: Build directory not found at {DIRECTORY}")
        print("Please run 'npm run build' in the frontend directory first.")
        sys.exit(1)
        
    print(f"Serving at http://localhost:{PORT} from {DIRECTORY}")
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print("Press Ctrl+C to stop the server")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
            httpd.shutdown()
