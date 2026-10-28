"""
EchoNest Edge AI Latency & Throughput Benchmark
Simulates degraded camera streams and benchmarks ONNX CPU inference on AMD Ryzen 7 7730U.
Target: Validate mean inference latency strictly under 15 ms.
"""

import time
import numpy as np
from confidence_engine import ConfidenceEngine
from adaptive_router import AdaptiveRouter

def run_benchmark(num_iterations: int = 500):
    print("=========================================================")
    print("  ECHONEST EDGE AI CPU LATENCY BENCHMARK (ONNX RUNTIME)  ")
    print("=========================================================")

    engine = ConfidenceEngine("confidence_model.onnx")
    router = AdaptiveRouter()

    # Generate synthetic degraded stream inputs
    np.random.seed(42)
    # Simulating transitioning from clear to dense smoke
    sharpness_stream = np.linspace(400.0, 15.0, num_iterations) + np.random.normal(0, 10, num_iterations)
    feature_stream = np.linspace(250, 12, num_iterations).astype(int)
    entropy_stream = np.clip(np.linspace(0.15, 0.85, num_iterations) + np.random.normal(0, 0.05, num_iterations), 0.0, 1.0)

    latencies_ms = []
    mode_counts = {}

    print(f"Executing {num_iterations} edge inference iterations...")
    total_start = time.perf_counter()

    for i in range(num_iterations):
        t0 = time.perf_counter()
        
        # 1. Run Confidence Engine ONNX Inference
        res = engine.evaluate(
            sharpness=float(sharpness_stream[i]),
            feature_count=int(feature_stream[i]),
            planar_entropy=float(entropy_stream[i])
        )

        # 2. Run Adaptive Router State Machine
        decision = router.route(
            trust_score=res.trust_score,
            remaining_battery_pct=70.0 - (i * 0.05),
            required_return_margin_pct=30.0
        )

        dt_ms = (time.perf_counter() - t0) * 1000.0
        latencies_ms.append(dt_ms)

        mode_counts[decision.active_mode] = mode_counts.get(decision.active_mode, 0) + 1

    total_time = time.perf_counter() - total_start
    latencies_ms = np.array(latencies_ms)

    mean_lat = np.mean(latencies_ms)
    median_lat = np.median(latencies_ms)
    p95_lat = np.percentile(latencies_ms, 95)
    p99_lat = np.percentile(latencies_ms, 99)
    min_lat = np.min(latencies_ms)
    max_lat = np.max(latencies_ms)
    throughput_fps = num_iterations / total_time

    print("\n[BENCHMARK RESULTS]")
    print(f"  * Total Processed Frames: {num_iterations}")
    print(f"  * Total Wall Clock Time:  {total_time:.3f} s")
    print(f"  * Mean Latency:           {mean_lat:.3f} ms (Target: < 15.0 ms) -> {'PASS' if mean_lat < 15.0 else 'FAIL'}")
    print(f"  * Median Latency:         {median_lat:.3f} ms")
    print(f"  * 95th Percentile (p95):  {p95_lat:.3f} ms")
    print(f"  * 99th Percentile (p99):  {p99_lat:.3f} ms")
    print(f"  * Min / Max Latency:      {min_lat:.3f} ms / {max_lat:.3f} ms")
    print(f"  * Throughput:             {throughput_fps:.1f} FPS")
    print("\n[ADAPTIVE SENSOR ROUTING BREAKDOWN]")
    for mode, count in mode_counts.items():
        pct = (count / num_iterations) * 100.0
        print(f"  * {mode:<25}: {count:3d} frames ({pct:.1f}%)")

    assert mean_lat < 15.0, f"Mean latency {mean_lat}ms exceeded 15ms target!"
    print("\n=========================================================")
    print("  ALL EDGE AI PERFORMANCE CRITERIA VERIFIED (PASS)!     ")
    print("=========================================================")

if __name__ == "__main__":
    run_benchmark(500)
