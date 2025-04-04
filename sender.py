import csv
import json
import time
import requests

# URL of the Flask server endpoint
FLASK_URL = "http://flask:5000/receive"

def send_packages(csv_file_path):
    # Open and read the CSV file
    with open(csv_file_path, 'r') as file:
        reader = csv.DictReader(file)
        packages = list(reader)  # Load all rows into a list

    # Sort packages by timestamp (assuming timestamp is in a comparable format)
    packages.sort(key=lambda x: x['Timestamp'])

    # Send packages with time delays
    previous_time = None
    for package in packages:
        # Convert package to JSON
        package_json = json.dumps({
            "ip_address": package["ip address"],
            "latitude": float(package["Latitude"]),
            "longitude": float(package["Longitude"]),
            "timestamp": package["Timestamp"],
            "suspicious": float(package["suspicious"])
        })

        # Calculate delay based on timestamp difference
        current_time = package["Timestamp"]
        if previous_time is not None:
            try:
                delay = float(current_time) - float(previous_time)
                if delay > 0:
                    time.sleep(delay)
            except ValueError:
                # If timestamps are strings (e.g., "2025-04-02 12:00:00"), handle differently
                print(f"Warning: Assuming no delay for timestamp {current_time}")
                time.sleep(1)  # Default delay if timestamp format is unclear

        # Send the package to the Flask server
        try:
            response = requests.post(FLASK_URL, data=package_json, headers={"Content-Type": "application/json"})
            print(f"Sent package from {package['ip address']} - Status: {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"Error sending package: {e}")

        previous_time = current_time

if __name__ == "__main__":
    print("Waiting for Flask server to start...")
    time.sleep(5)
    csv_file_path = "ip_addresses.csv"
    send_packages(csv_file_path)