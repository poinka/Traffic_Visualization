from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

# In-memory storage for received packages
packages = []

@app.route('/receive', methods=['POST'])
def receive_package():
    # Get JSON data from the request
    package = request.get_json()
    if not package:
        return jsonify({"error": "No JSON data received"}), 400

    # Validate required fields
    required_fields = ["ip_address", "latitude", "longitude", "timestamp", "suspicious"]
    if not all(field in package for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    # Add the package to storage
    packages.append(package)
    print(f"Received package from {package['ip_address']}")
    return jsonify({"status": "Package received"}), 200

@app.route('/data', methods=['GET'])
def get_data():
    # Return all stored packages to the frontend
    return jsonify(packages)

@app.route('/')
def serve_index():
    return app.send_static_file('index.html')

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)