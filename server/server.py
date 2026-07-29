import json
import os
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler

DB_PATH = os.path.join(os.path.dirname(__file__), 'users.json')

def read_db():
    if not os.path.exists(DB_PATH):
        return {"users": []}
    try:
        with open(DB_PATH, 'r') as f:
            return json.load(f)
    except:
        return {"users": []}

def write_db(data):
    with open(DB_PATH, 'w') as f:
        json.dump(data, f, indent=2)

class AuthHandler(SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            body = json.loads(post_data.decode('utf-8'))
        except:
            self.wfile.write(json.dumps({"error": "Invalid JSON"}).encode('utf-8'))
            return
            
        identifier = body.get('identifier')
        password = body.get('password')
        
        if not identifier or not password:
            self.wfile.write(json.dumps({"error": "Identifier and password required"}).encode('utf-8'))
            return
            
        db = read_db()
        
        if self.path == '/api/auth/signup':
            for user in db['users']:
                if user['identifier'] == identifier:
                    self.wfile.write(json.dumps({"error": "User already exists"}).encode('utf-8'))
                    return
            
            new_user = {
                "id": str(int(time.time() * 1000)),
                "identifier": identifier,
                "password": password
            }
            db['users'].append(new_user)
            write_db(db)
            self.wfile.write(json.dumps({"message": "Signup successful", "user": {"identifier": identifier}}).encode('utf-8'))
            
        elif self.path == '/api/auth/login':
            for user in db['users']:
                if user['identifier'] == identifier and user['password'] == password:
                    self.wfile.write(json.dumps({"message": "Login successful", "user": {"identifier": identifier}}).encode('utf-8'))
                    return
            self.wfile.write(json.dumps({"error": "Invalid credentials"}).encode('utf-8'))
        else:
            self.wfile.write(json.dumps({"error": "Not found"}).encode('utf-8'))

def run(server_class=HTTPServer, handler_class=AuthHandler, port=3000):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f'Starting Python backend server on port {port}...')
    httpd.serve_forever()

if __name__ == '__main__':
    run()
