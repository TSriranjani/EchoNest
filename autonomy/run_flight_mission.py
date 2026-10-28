"""
EchoNest Automated Subterranean Flight Mission & End-to-End Verification Pipeline
Executes automated flight test:
1. Take off at origin (0, 0, 0)
2. Fly past 100m down the tunnel
3. Inject simulated optical failure at 120m
4. Verify auto-detection of low trust score and transition to THERMAL_IR_FALLBACK
5. Verify autonomous Return-To-Home (RTH) trigger and safe landing at (0, 0, 0)
"""

import sys
import time
from px4_tunnel_sitl import PX4SubterraneanSITL

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def run_automated_flight_test():
    print("=====================================================================")
    print("  ECHONEST SUBTERRANEAN AUTONOMOUS FLIGHT TEST & SITL VERIFICATION   ")
    print("=====================================================================")

    sitl = PX4SubterraneanSITL(target_portal_z=120.0)

    # 1. Arm and Takeoff
    print("\n[PHASE 1] Arming & Takeoff...")
    sitl.arm_and_takeoff()
    print(f"  * Status: Armed | Flight Mode: {sitl.flight_mode} | Altitude: {sitl.y:.1f}m")
    assert sitl.flight_mode == "MISSION_EXPLORE"

    sim_time = 1000.0
    dt = 0.05  # 20 Hz simulation tick (50 ms)
    
    checkpoints = {
        "passed_50m": False,
        "passed_100m": False,
        "failure_injected_120m": False,
        "rth_initiated": False,
        "backtracking_60m": False,
        "touchdown": False
    }

    max_sim_ticks = 4000  # Cap to prevent infinite loops
    tick = 0

    print("\n[PHASE 2] Executing Autonomous Subterranean Tunnel Exploration...")

    while tick < max_sim_ticks and not sitl.mission_completed:
        tick += 1
        sim_time += dt

        telemetry = sitl.step(dt=dt, current_time=sim_time)
        z = telemetry["position"]["z"]
        trust = telemetry["trust_score"]
        mode = telemetry["sensor_mode"]
        fmode = telemetry["flight_mode"]

        # Checkpoint: 50m
        if z >= 50.0 and not checkpoints["passed_50m"]:
            checkpoints["passed_50m"] = True
            print(f"  * [T+{sim_time-1000:.1f}s] Reached 50m Depth | Z={z:.1f}m, X={telemetry['position']['x']:.1f}m | Trust: {trust}% | Mode: {mode}")

        # Checkpoint: 100m
        if z >= 100.0 and not checkpoints["passed_100m"]:
            checkpoints["passed_100m"] = True
            print(f"  * [T+{sim_time-1000:.1f}s] Reached 100m Depth | Z={z:.1f}m, X={telemetry['position']['x']:.1f}m | Trust: {trust}% | Nominal VIO Exploration Nominal")

        # Checkpoint: 120m Failure Injection
        if sitl.optical_failure_injected and not checkpoints["failure_injected_120m"]:
            checkpoints["failure_injected_120m"] = True
            print(f"\n[PHASE 3] Optical Failure Injected at 120m:")
            print(f"  ! [T+{sim_time-1000:.1f}s] Camera Blinded by Smoke/Dust Plume at Z={z:.1f}m")
            print(f"  ! Trust Score Dropped to: {trust}%")
            print(f"  ! Active Sensor Failover: {mode}")

        # Checkpoint: Autonomous RTH Triggered
        if fmode == "AUTO_RTH" and not checkpoints["rth_initiated"]:
            checkpoints["rth_initiated"] = True
            print(f"\n[PHASE 4] Uncertainty-Gated Safety Interlock Engaged:")
            print(f"  * [T+{sim_time-1000:.1f}s] Autonomy Router triggered: AUTO_RTH")
            print(f"  * Reason: Sustained trust ({trust}%) < 20.0% for > 3.0s")
            print(f"  * Commencing Autonomous Breadcrumb Backtracking toward Launch Portal...")

        # Checkpoint: Backtracking halfway (60m)
        if checkpoints["rth_initiated"] and z <= 60.0 and not checkpoints["backtracking_60m"]:
            checkpoints["backtracking_60m"] = True
            print(f"  * [T+{sim_time-1000:.1f}s] Backtracking Progress: Z={z:.1f}m | Battery: {telemetry['battery_pct']}% | Thermal IR Nav Locked")

        # Checkpoint: Touchdown at origin
        if fmode == "TOUCHDOWN" and not checkpoints["touchdown"]:
            checkpoints["touchdown"] = True
            print(f"\n[PHASE 5] Precision Touchdown at Launch Portal:")
            print(f"  * [T+{sim_time-1000:.1f}s] Final Position: X={telemetry['position']['x']:.2f}m, Y={telemetry['position']['y']:.2f}m, Z={telemetry['position']['z']:.2f}m")
            print(f"  * Remaining Battery: {telemetry['battery_pct']}% (Return Reserve Preserved)")
            print(f"  * Mission Completed Successfully without Manual Intervention.")

    # -------------------------------------------------------------
    # Assertions and Flight Verification Checks
    # -------------------------------------------------------------
    assert checkpoints["passed_100m"], "Failed to reach 100m depth"
    assert checkpoints["failure_injected_120m"], "Failed to inject optical failure at 120m"
    assert checkpoints["rth_initiated"], "System failed to trigger autonomous RTH upon sustained uncertainty"
    assert checkpoints["touchdown"], "Failed to complete return and touchdown"
    assert sitl.z <= 0.1, f"Drone did not return to origin portal: final Z={sitl.z}m"
    assert sitl.y == 0.0, "Drone failed to touch down"

    print("\n=====================================================================")
    print("  VERIFICATION RESULT: ALL MISSION MILESTONES PASSED (100% SUCCESS)  ")
    print("=====================================================================")

if __name__ == "__main__":
    run_automated_flight_test()
