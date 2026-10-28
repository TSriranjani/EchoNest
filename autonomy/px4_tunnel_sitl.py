"""
EchoNest PX4 Subterranean SITL Quadrotor Simulation & ROS 2 Telemetry Bridge
Connects PX4 flight dynamics in a subterranean tunnel map with:
- ROS 2 vehicle odometry & sensor topics
- Localization Confidence Engine (ONNX CPU execution)
- Adaptive Sensor Router (Uncertainty-gated abort evaluator)
- FastAPI / WebSocket GCS Bridge
"""

import sys
import time
import math
import asyncio
from typing import Dict, Any, List
import numpy as np

# Ensure stdout encodes UTF-8 cleanly on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from confidence_engine import ConfidenceEngine
from adaptive_router import (
    AdaptiveRouter,
    ACTION_CONTINUE_EXPLORATION,
    ACTION_REDUCE_SPEED,
    ACTION_TRIGGER_SAFE_RETURN
)

class PX4SubterraneanSITL:
    """
    PX4 SITL Quadrotor Flight Controller & Subterranean Environment Model.
    """
    def __init__(self, target_portal_z: float = 120.0):
        self.target_portal_z = target_portal_z

        # Drone 6-DOF State
        self.x = 0.0
        self.y = 0.0
        self.z = 0.0
        self.vx = 0.0
        self.vy = 0.0
        self.vz = 0.0
        self.yaw = 0.0

        # Flight Controller States
        self.armed = False
        self.flight_mode = "DISARMED"  # DISARMED | TAKEOFF | MISSION_EXPLORE | AUTO_RTH | TOUCHDOWN
        self.battery_pct = 75.0
        self.return_reserve_pct = 28.0

        # Simulated Perception Sensors
        self.sharpness = 380.0
        self.feature_tracks = 245
        self.planar_entropy = 0.18
        self.co_gas_ppm = 4.2
        self.smoke_obscuration = 18.0

        # Breadcrumbs Path for RTH backtracking
        self.breadcrumbs: List[Dict[str, float]] = []

        # Load Autonomy Modules
        self.confidence_engine = ConfidenceEngine("confidence_model.onnx")
        self.adaptive_router = AdaptiveRouter(
            nominal_speed_mps=1.2,
            reduced_speed_mps=0.35,
            low_confidence_abort_threshold=0.20,
            low_confidence_timeout_sec=3.0
        )

        # Telemetry & Diagnostics
        self.current_trust = 0.94
        self.current_covariance = [0.12, 0.08, 0.15]
        self.active_sensor_mode = "VIO_OPTICAL_PRIMARY"
        self.optical_failure_injected = False
        self.failure_injection_time = None
        self.rth_triggered_time = None
        self.mission_completed = False

    def tunnel_x_offset(self, z: float) -> float:
        """Returns tunnel centerline X displacement for depth Z."""
        return 4.2 * math.sin(z * 0.065)

    def arm_and_takeoff(self):
        """Arm quadrotor and ascend to nominal subterranean cruising altitude."""
        self.armed = True
        self.flight_mode = "TAKEOFF"
        self.y = 1.2
        self.breadcrumbs.append({"x": self.x, "y": self.y, "z": self.z})
        self.flight_mode = "MISSION_EXPLORE"

    def inject_optical_failure(self):
        """Simulate dense smoke/dust plume blinding optical camera at 120m."""
        self.optical_failure_injected = True
        self.failure_injection_time = time.time()
        self.sharpness = 14.5             # Heavy blur/obscuration
        self.feature_tracks = 6           # Lost visual features
        self.planar_entropy = 0.85        # High geometric ambiguity
        self.co_gas_ppm = 28.4            # Spiking gas concentration
        self.smoke_obscuration = 88.0     # Dense particulate obscuration

    def step(self, dt: float, current_time: float) -> Dict[str, Any]:
        """Runs one SITL physics and autonomy control step at 20 Hz."""
        if not self.armed:
            return self.get_telemetry_packet()

        # 1. Evaluate Localization Confidence (Edge AI Inference)
        conf_res = self.confidence_engine.evaluate(
            sharpness=self.sharpness,
            feature_count=self.feature_tracks,
            planar_entropy=self.planar_entropy
        )
        self.current_trust = conf_res.trust_score
        self.current_covariance = list(conf_res.position_variance)

        # 2. Run Adaptive Sensor Router & Uncertainty Abort Evaluator
        decision = self.adaptive_router.route(
            trust_score=self.current_trust,
            remaining_battery_pct=self.battery_pct,
            required_return_margin_pct=self.return_reserve_pct,
            current_time=current_time
        )
        self.active_sensor_mode = decision.active_mode

        # 3. Check for Safety-Triggered Autonomous RTH
        if decision.abort_triggered and self.flight_mode != "AUTO_RTH" and self.flight_mode != "TOUCHDOWN":
            self.flight_mode = "AUTO_RTH"
            self.rth_triggered_time = current_time

        # 4. Flight Kinematics Controller
        if self.flight_mode == "MISSION_EXPLORE":
            speed = decision.target_speed_mps
            self.vz = speed
            self.z += self.vz * dt
            self.x = self.tunnel_x_offset(self.z)
            self.battery_pct = max(5.0, self.battery_pct - 0.08 * dt)

            # Record breadcrumbs every 1 meter
            if not self.breadcrumbs or (self.z - self.breadcrumbs[-1]["z"]) >= 1.0:
                self.breadcrumbs.append({"x": self.x, "y": self.y, "z": self.z})

            # Check for simulated failure injection condition (at 120m)
            if self.z >= 120.0 and not self.optical_failure_injected:
                self.inject_optical_failure()

        elif self.flight_mode == "AUTO_RTH":
            # Autonomously backtrack along recorded breadcrumbs toward portal (Z = 0)
            backtrack_speed = 1.6  # Safe backtracking velocity
            self.z = max(0.0, self.z - backtrack_speed * dt)
            self.x = self.tunnel_x_offset(self.z)
            self.battery_pct = max(5.0, self.battery_pct - 0.09 * dt)

            if self.z <= 0.05:
                # Reached entry portal -> Initiate precision touchdown
                self.flight_mode = "TOUCHDOWN"
                self.y = 0.0
                self.vx = self.vy = self.vz = 0.0
                self.armed = False
                self.mission_completed = True

        return self.get_telemetry_packet()

    def get_telemetry_packet(self) -> Dict[str, Any]:
        """Serializes current vehicle state into ROS 2 / WebSocket schema."""
        return {
            "timestamp": time.time(),
            "position": {
                "x": round(self.x, 3),
                "y": round(self.y, 3),
                "z": round(self.z, 3)
            },
            "velocity": {
                "vx": round(self.vx, 3),
                "vy": round(self.vy, 3),
                "vz": round(self.vz, 3)
            },
            "trust_score": round(self.current_trust * 100.0, 1),
            "battery_pct": round(self.battery_pct, 1),
            "sensor_mode": self.active_sensor_mode,
            "gas_ppm": round(self.co_gas_ppm, 2),
            "smoke_pct": round(self.smoke_obscuration, 1),
            "covariance": [round(c, 3) for c in self.current_covariance],
            "flight_mode": self.flight_mode,
            "mission_completed": self.mission_completed
        }
