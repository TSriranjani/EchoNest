# EchoNest: Uncertainty-Aware Autonomous Subterranean Drone System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python: 3.12](https://img.shields.io/badge/Python-3.12-3776AB.svg?logo=python)](https://python.org)
[![FastAPI: 0.115+](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![React: 18.3](https://img.shields.io/badge/React-18.3-61DAFB.svg?logo=react)](https://react.dev)
[![Three.js: WebGL](https://img.shields.io/badge/Three.js-WebGL_60FPS-000000.svg?logo=three.js)](https://threejs.org)
[![Pytest: Passing](https://img.shields.io/badge/pytest-7%2F7_Passed-brightgreen.svg?logo=pytest)](tests/)

**EchoNest** is a dual-use autonomous robotics exploration system designed for **GPS-denied, enclosed, and subterranean environments**. 

The core technical differentiator is an **uncertainty-aware navigation system** that continuously estimates its localization trustworthiness, dynamically adapts perception modes across sensor failures (dust, smoke, zero visibility), and evaluates safety-critical return reserves before encountering unrecoverable localization drift.

---

## 🎯 Target Applications

| Domain | Operational Scenario | Value Proposition |
| :--- | :--- | :--- |
| **Defence Reconnaissance** | Underground tunnel networks, military bunkers, sub-installations | Autonomous 3D SLAM mapping where GPS and RF control links are denied |
| **Disaster Response** | Collapsed structures, damaged hangars, structural voids | Real-time volumetric hazard mapping and trapped survivor search |
| **Industrial / Mining** | Mine rescue, hazardous pipeline and shaft inspections | Atmospheric toxic gas (CO, VOC) monitoring & structural acoustic resonance detection |

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   PX4 SUBTERRANEAN SITL QUADROTOR SIMULATION                          │
│                                                                                        │
│  - 6-DOF Subterranean Kinematics in S-Curve Tunnel [X = 4.2 sin(0.065 Z)]             │
│  - Edge AI Confidence Engine (ONNX CPU Runtime @ 139 μs latency)                       │
│  - Adaptive Sensor Router with Uncertainty Abort Gate (<20% Trust for >3.0s)          │
│  - Simulated ROS 2 Topics: /px4/out/vehicle_odometry, /sensor/co_gas                  │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │ 20 Hz Async Telemetry & Odometry
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   FASTAPI TELEMETRY RELAY ENGINE (Port 8000)                          │
│                                                                                        │
│  - Asynchronous WebSockets (/ws/telemetry) with ujson serialization                   │
│  - Coordinate Translator API (/api/georeference)                                       │
│  - Disconnect Fail-Safe Heartbeat Monitor                                             │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │ Live WebSockets (ws://localhost:8000/ws/telemetry)
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   REACT + THREE.JS GROUND CONTROL STATION (Port 3000)                 │
│                                                                                        │
│  - 3D LiDAR Point-Cloud Viewport with Dynamic Covariance Ellipsoid                     │
│  - Green Breadcrumb Safe Retracing Trail                                               │
│  - Raycasting Subterranean Coordinate Pin-Drop Tooltip                                 │
│  - Atmospheric Sidebar (CO Gas, Tremor, Depth, Smoke Obscuration)                      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Project Structure

```bash
EchoNest/
├── frontend/               # React 18 + Three.js Ground Control Station (GCS)
│   ├── src/
│   │   ├── components/
│   │   │   ├── CenterViewport.jsx  # 60 FPS Three.js point-cloud & raycast pin-drop
│   │   │   ├── LeftSidebar.jsx     # Atmospheric & hazard telemetry (CO, Tremor, Depth)
│   │   │   ├── RightSidebar.jsx    # Trust score gauge & adaptive sensor matrix
│   │   │   ├── Header.jsx          # Tactical status, profile switcher, battery reserve
│   │   │   └── BottomDeck.jsx      # Mission action deck (Explore, Hold, RTH)
│   │   ├── App.jsx                 # WebSocket live telemetry state manager
│   │   └── index.css               # Dark-slate tactical HUD styling
│   ├── package.json
│   └── vite.config.js
│
├── backend/                # FastAPI + WebSockets Telemetry Relay Engine
│   ├── main.py             # 20 Hz async ROS 2 odometry publisher & georeference API
│   └── test_client.py      # Socket throughput & failsafe validation suite
│
├── autonomy/               # Edge AI Confidence Engine & PX4 Simulation
│   ├── confidence_engine.py # ONNX CPU trust estimator (Laplacian + features + planar entropy)
│   ├── adaptive_router.py   # Sensor switching state machine & uncertainty abort interlock
│   ├── confidence_model.onnx# Compiled ONNX execution graph for edge deployment
│   ├── model_exporter.py    # PyTorch neural architecture and ONNX exporter
│   ├── px4_tunnel_sitl.py   # 6-DOF subterranean quadrotor simulation model
│   ├── run_flight_mission.py# End-to-end automated flight test loop
│   ├── benchmark.py         # 500-frame CPU latency benchmark (< 15 ms target)
│   ├── pytest.ini
│   └── tests/
│       └── test_confidence_engine.py # 7 unit & integration tests (100% pass)
│
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Run the Frontend Ground Control Station
```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:3000/](http://localhost:3000/)** in your browser.

### 2. Run the FastAPI Telemetry Bridge
```bash
cd backend
pip install -r requirements.txt   # fastapi uvicorn ujson websockets
uvicorn main:app --reload --port 8000
```
Interactive Swagger API docs: **[http://localhost:8000/docs](http://localhost:8000/docs)**.

### 3. Run the Automated Flight Test Loop
```bash
cd autonomy
python run_flight_mission.py
```

### 4. Run Unit Tests & Edge AI Latency Benchmark
```bash
cd autonomy
pytest -v
python benchmark.py
```

---

## 📊 Verification & Benchmarks

* **Edge AI Latency**: **0.139 ms** mean CPU execution per frame on AMD Ryzen 7 7730U (over 100× faster than the 15 ms real-time ceiling; throughput: **7,117 FPS**).
* **Automated Flight Test**: Validated full autonomous envelope (Takeoff $\to$ 100m $\to$ Optical Failure at 120m $\to$ Auto-RTH $\to$ Precision Touchdown at $(0, 0, 0)$).
* **Unit Tests**: 7/7 test suites passing.

---

## 📄 License
This project is licensed under the MIT License.
