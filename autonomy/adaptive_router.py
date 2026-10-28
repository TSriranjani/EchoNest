"""
EchoNest Adaptive Sensor Router & Uncertainty-Gated Abort Evaluator
Implements autonomous sensor switching state machine and failsafe safety decision loop.
"""

import time
from dataclasses import dataclass
from typing import Optional

# Operational Sensor Modes
MODE_VIO_OPTICAL_PRIMARY = "VIO_OPTICAL_PRIMARY"
MODE_LIDAR_DEEP_FUSION = "LIDAR_DEEP_FUSION"
MODE_THERMAL_IR_FALLBACK = "THERMAL_IR_FALLBACK"

# Tactical Actions
ACTION_CONTINUE_EXPLORATION = "ACTION_CONTINUE_EXPLORATION"
ACTION_REDUCE_SPEED = "ACTION_REDUCE_SPEED"
ACTION_TRIGGER_SAFE_RETURN = "ACTION_TRIGGER_SAFE_RETURN"

@dataclass
class AdaptiveDecision:
    active_mode: str
    target_speed_mps: float
    tactical_action: str
    low_confidence_duration_sec: float
    abort_triggered: bool
    abort_reason: Optional[str]

class AdaptiveRouter:
    """
    Subterranean Adaptive Perception Router with Uncertainty-Gated Safety Interlocks.
    """
    def __init__(
        self,
        nominal_speed_mps: float = 1.0,
        reduced_speed_mps: float = 0.30,
        low_confidence_abort_threshold: float = 0.20,
        low_confidence_timeout_sec: float = 3.0
    ):
        self.nominal_speed_mps = nominal_speed_mps
        self.reduced_speed_mps = reduced_speed_mps
        self.low_confidence_abort_threshold = low_confidence_abort_threshold
        self.low_confidence_timeout_sec = low_confidence_timeout_sec

        # State tracking
        self.current_mode = MODE_VIO_OPTICAL_PRIMARY
        self.low_confidence_start_time: Optional[float] = None
        self.abort_latched: bool = False
        self.abort_reason: Optional[str] = None

    def reset_abort(self):
        """Resets the latched abort state upon manual operator override."""
        self.abort_latched = False
        self.abort_reason = None
        self.low_confidence_start_time = None

    def route(
        self,
        trust_score: float,
        remaining_battery_pct: float,
        required_return_margin_pct: float,
        current_time: Optional[float] = None
    ) -> AdaptiveDecision:
        """
        Evaluates real-time trust score, battery margin, and time thresholds.
        Returns sensor mode, speed limit, and tactical action.
        """
        now = time.time() if current_time is None else current_time

        # -------------------------------------------------------------
        # 1. State Machine: Adaptive Sensor Switching Logic
        # -------------------------------------------------------------
        if trust_score >= 0.70:
            self.current_mode = MODE_VIO_OPTICAL_PRIMARY
            target_speed = self.nominal_speed_mps
            tactical_action = ACTION_CONTINUE_EXPLORATION
        elif 0.35 <= trust_score < 0.70:
            self.current_mode = MODE_LIDAR_DEEP_FUSION
            target_speed = self.nominal_speed_mps * 0.7  # 0.70 m/s
            tactical_action = ACTION_CONTINUE_EXPLORATION
        else:  # trust_score < 0.35
            self.current_mode = MODE_THERMAL_IR_FALLBACK
            target_speed = self.reduced_speed_mps        # 0.30 m/s (Speed Reduction)
            tactical_action = ACTION_REDUCE_SPEED

        # -------------------------------------------------------------
        # 2. Uncertainty-Gated Abort Evaluator (Core Research Feature)
        # -------------------------------------------------------------
        low_conf_duration = 0.0

        # Check Condition A: Sustained Low Confidence (< 0.20 for > 3.0s)
        if trust_score < self.low_confidence_abort_threshold:
            if self.low_confidence_start_time is None:
                self.low_confidence_start_time = now
            low_conf_duration = now - self.low_confidence_start_time

            if low_conf_duration >= self.low_confidence_timeout_sec:
                self.abort_latched = True
                self.abort_reason = (
                    f"SUSTAINED_UNCERTAINTY: C_loc ({trust_score:.2f}) < {self.low_confidence_abort_threshold} "
                    f"for {low_conf_duration:.1f}s >= {self.low_confidence_timeout_sec}s"
                )
        else:
            # Recovery: Trust returned to acceptable floor
            self.low_confidence_start_time = None

        # Check Condition B: Point of No Return Battery Check
        # If remaining battery is equal to or less than return-trip margin
        if remaining_battery_pct <= required_return_margin_pct:
            self.abort_latched = True
            self.abort_reason = (
                f"BATTERY_POINT_OF_NO_RETURN: Remaining ({remaining_battery_pct:.1f}%) <= "
                f"Required Return Reserve ({required_return_margin_pct:.1f}%)"
            )

        # Trigger Abort if any safety condition latched
        if self.abort_latched:
            tactical_action = ACTION_TRIGGER_SAFE_RETURN
            target_speed = self.reduced_speed_mps

        return AdaptiveDecision(
            active_mode=self.current_mode,
            target_speed_mps=round(target_speed, 2),
            tactical_action=tactical_action,
            low_confidence_duration_sec=round(low_conf_duration, 2),
            abort_triggered=self.abort_latched,
            abort_reason=self.abort_reason
        )
