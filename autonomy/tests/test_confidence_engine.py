"""
Unit and Integration Tests for EchoNest Localization Confidence Engine & Adaptive Router
"""

import os
import sys
import pytest
import numpy as np

# Ensure parent directory containing confidence_engine and adaptive_router is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from confidence_engine import (
    ConfidenceEngine,
    compute_laplacian_variance,
    compute_planar_entropy
)
from adaptive_router import (
    AdaptiveRouter,
    MODE_VIO_OPTICAL_PRIMARY,
    MODE_LIDAR_DEEP_FUSION,
    MODE_THERMAL_IR_FALLBACK,
    ACTION_CONTINUE_EXPLORATION,
    ACTION_REDUCE_SPEED,
    ACTION_TRIGGER_SAFE_RETURN
)

@pytest.fixture
def engine():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    model_path = os.path.join(base_dir, "confidence_model.onnx")
    return ConfidenceEngine(model_path=model_path)

@pytest.fixture
def router():
    return AdaptiveRouter(
        nominal_speed_mps=1.0,
        reduced_speed_mps=0.30,
        low_confidence_abort_threshold=0.20,
        low_confidence_timeout_sec=3.0
    )

# -------------------------------------------------------------
# 1. Feature Extraction Tests
# -------------------------------------------------------------

def test_laplacian_variance_sharp_vs_blurred():
    # Sharp high-frequency checkerboard pattern
    sharp_img = np.zeros((100, 100), dtype=np.float32)
    sharp_img[::2, ::2] = 255.0
    sharp_var = compute_laplacian_variance(sharp_img)

    # Smooth blurred gradient image
    smooth_img = np.tile(np.linspace(0, 100, 100, dtype=np.float32), (100, 1))
    smooth_var = compute_laplacian_variance(smooth_img)

    assert sharp_var > smooth_var
    assert sharp_var > 100.0

def test_planar_entropy_geometric_vs_degenerate():
    # 3D points forming a rich corner/room structure
    wall1 = np.column_stack([np.zeros(50), np.linspace(0, 3, 50), np.linspace(0, 3, 50)])
    wall2 = np.column_stack([np.linspace(0, 3, 50), np.zeros(50), np.linspace(0, 3, 50)])
    rich_pts = np.vstack([wall1, wall2])
    entropy_rich = compute_planar_entropy(rich_pts)

    assert 0.0 <= entropy_rich <= 1.0

# -------------------------------------------------------------
# 2. Confidence Engine ONNX Inference Tests
# -------------------------------------------------------------

def test_confidence_engine_nominal_conditions(engine):
    # Sharp image (350), 220 visual tracks, low planar entropy (0.15)
    result = engine.evaluate(sharpness=350.0, feature_count=220, planar_entropy=0.15)

    assert result.trust_score >= 0.70
    assert 0.0 <= result.trust_score <= 1.0
    # Position variance should be small (< 1.5 m^2) under high trust
    assert result.position_variance[0] < 1.5
    assert result.position_variance[1] < 1.5
    assert result.position_variance[2] < 2.0
    assert result.inference_latency_ms < 15.0  # Ultra-fast CPU execution

def test_confidence_engine_degraded_conditions(engine):
    # Heavy dust/smoke: low sharpness (25), 18 feature tracks, high entropy (0.80)
    result = engine.evaluate(sharpness=25.0, feature_count=18, planar_entropy=0.80)

    assert result.trust_score < 0.35
    # Variance should expand significantly
    assert result.position_variance[0] > 2.0
    assert result.position_variance[2] > 2.0

# -------------------------------------------------------------
# 3. Adaptive Router State Machine Transitions
# -------------------------------------------------------------

def test_adaptive_router_transitions(router):
    # High Trust (C_loc >= 0.70)
    d1 = router.route(trust_score=0.88, remaining_battery_pct=80.0, required_return_margin_pct=30.0)
    assert d1.active_mode == MODE_VIO_OPTICAL_PRIMARY
    assert d1.target_speed_mps == 1.0
    assert d1.tactical_action == ACTION_CONTINUE_EXPLORATION
    assert not d1.abort_triggered

    # Mid Trust (0.35 <= C_loc < 0.70)
    d2 = router.route(trust_score=0.55, remaining_battery_pct=75.0, required_return_margin_pct=30.0)
    assert d2.active_mode == MODE_LIDAR_DEEP_FUSION
    assert d2.target_speed_mps == 0.70
    assert d2.tactical_action == ACTION_CONTINUE_EXPLORATION

    # Low Trust (C_loc < 0.35) -> Triggers Speed Reduction
    d3 = router.route(trust_score=0.28, remaining_battery_pct=70.0, required_return_margin_pct=30.0)
    assert d3.active_mode == MODE_THERMAL_IR_FALLBACK
    assert d3.target_speed_mps == 0.30
    assert d3.tactical_action == ACTION_REDUCE_SPEED

# -------------------------------------------------------------
# 4. Uncertainty-Gated Abort Evaluator Tests
# -------------------------------------------------------------

def test_abort_on_sustained_low_confidence_3sec_timeout(router):
    t_start = 1000.0

    # Step 1: Low trust encountered (t = 1000.0s, duration = 0.0s)
    d1 = router.route(0.15, remaining_battery_pct=60.0, required_return_margin_pct=25.0, current_time=t_start)
    assert not d1.abort_triggered
    assert d1.tactical_action == ACTION_REDUCE_SPEED

    # Step 2: 2.0 seconds elapsed (t = 1002.0s, duration = 2.0s < 3.0s threshold)
    d2 = router.route(0.14, remaining_battery_pct=59.0, required_return_margin_pct=25.0, current_time=t_start + 2.0)
    assert not d2.abort_triggered

    # Step 3: 3.2 seconds elapsed (t = 1003.2s, duration = 3.2s >= 3.0s threshold) -> ABORT!
    d3 = router.route(0.12, remaining_battery_pct=58.0, required_return_margin_pct=25.0, current_time=t_start + 3.2)
    assert d3.abort_triggered
    assert d3.tactical_action == ACTION_TRIGGER_SAFE_RETURN
    assert "SUSTAINED_UNCERTAINTY" in d3.abort_reason

def test_abort_on_battery_point_of_no_return(router):
    # Trust is nominal (0.92), but battery reaches exact return margin (28.0% <= 28.0%)
    decision = router.route(
        trust_score=0.92,
        remaining_battery_pct=28.0,
        required_return_margin_pct=28.0,
        current_time=2000.0
    )
    assert decision.abort_triggered
    assert decision.tactical_action == ACTION_TRIGGER_SAFE_RETURN
    assert "BATTERY_POINT_OF_NO_RETURN" in decision.abort_reason
