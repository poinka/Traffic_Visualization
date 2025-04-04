# Web Traffic Visualization with Flask, Three.js, and Docker

This project visualizes web traffic data on an interactive 3D globe using Three.js. It simulates sending packages from various locations around the world to a Flask server, which then serves the data to a frontend for visualization. The project is containerized using Docker and can be run with a single `docker-compose` command.

## Project Overview

The project consists of three main components:
1. **Sender (`sender.py`)**: A Python script that reads a `.csv` file containing IP addresses, latitudes, longitudes, and sends simulated packages to a Flask server using time intervals.
2. **Flask Server (`server.py`)**: A Flask server that receives packages via POST requests, stores them, and serves the data to the frontend via a GET endpoint.
3. **Frontend (`visualization.js`)**: A Three.js-based visualization that displays package locations on a 3D globe, with interactive features like a list of the most common locations and a tooltip for package details.

The project is wrapped in Docker containers and orchestrated using `docker-compose` for easy deployment.

### Features
- **3D Globe Visualization**: Displays package locations on a globe using Three.js.
- **Real-Time Updates**: Packages appear on the globe in real-time with a fading effect (visible for 10 seconds, fading over 5 seconds).
- **Interactive Features**:
  - A list of the 5 most common locations, updated in real-time.
  - Click on a location in the list to move the camera to that location.
  - Hover over a point on the globe to see package details (IP, location, timestamp, suspicious status).
- **Dockerized**: The entire application runs in Docker containers for reproducibility.

## Prerequisites

To run this project, you need the following installed on your system:
- [Docker](https://www.docker.com/get-started) (includes Docker Compose)
- [Git](https://git-scm.com/downloads) (to clone the repository)

## How to Run the Project

Follow these steps to run the project on your local machine:

### 1. Clone the Repository
Clone this repository to your local machine using Git:

```bash
git clone https://github.com/poinka/Traffic_Visualization.git
cd Traffic_Visualization
```

### 2. Build and Run with Docker Compose
The project uses Docker Compose to manage the containers. Build and run the containers with the following command:

```bash
docker-compose up --build
```

The --build flag ensures that the Docker images are rebuilt if there are changes.
This command will start two services:

- **flask**: The Flask server running on port 5000.
- **sender**: The script that sends simulated packages to the Flask server.

### 3. Access the Visualization
Once the containers are running, open your web browser and navigate to:

```text
http://localhost:5000

```

You should see a 3D globe with points appearing in real-time and a list of the most common locations.
