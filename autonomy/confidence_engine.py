"""
EchoNest Localization Confidence Estimator
Evaluates multi-modal sensor health (visual sharpness, feature tracks, LiDAR planar entropy)
and computes real-time normalized Trust Score (C_loc in [0.0, 1.0]) and 3D position variance (sigma^2).
Optimized for ultra-low latency (<15 ms) CPU execution on AMD Ryzen 7 7730U / Jetson Orin / RPi CM4.
"""

import os
import time
from dataclasses import dataclass
from typing import Tuple, Optional
import numpy as np
import onnxruntime as ort

@dataclass
class ConfidenceResult:
    trust_score: float                 # C_loc in [0.0, 1.0]
    position_variance: Tuple[float, float, float]  # (sigma_x^2, sigma_y^2, sigma_z^2) in m^2
    sharpness_norm: float
    feature_count_norm: float
    planar_entropy: float
    inference_latency_ms: float

def compute_laplacian_variance(gray_image: np.ndarray) -> float:
    """
    Computes visual focus/sharpness via Laplacian variance using pure NumPy (discrete 3x3 kernel).
    Independent of OpenCV for lean edge deployment.
    """
    if gray_image.ndim != 2:
        raise ValueError("Expected 2D grayscale image array")

    # Discrete 3x3 Laplacian convolution kernel: [[0, 1, 0], [1, -4, 1], [0, 1, 0]]
    lap = (
        np.roll(gray_image, 1, axis=0) +
        np.roll(gray_image, -1, axis=0) +
        np.roll(gray_image, 1, axis=1) +
        np.roll(gray_image, -1, axis=1) -
        4.0 * gray_image
    )
    # Ignore boundaries for variance
    cropped = lap[1:-1, 1:-1]
    return float(np.var(cropped))

def compute_planar_entropy(points: np.ndarray) -> float:
    """
    Computes LiDAR point cloud planar entropy from 3D covariance eigenvalues.
    Measures geometric degeneracy in long, featureless concrete tunnels.
    Low entropy (< 0.3) = Rich geometric structures (corners, arches, vault).
    High entropy (> 0.7) = Flat, featureless, or degenerate hallway.
    """
    if points.ndim != 2 or points.shape[1] != 3:
        raise ValueError("Points must be an (N, 3) numpy array")
    if points.shape[0] < 4:
        return 1.0  # Degenerate fallback

    # Center points
    centered = points - np.mean(points, axis=0)
    cov = np.cov(centered, rowvar=False)

    # Compute eigenvalues
    eigenvalues = np.linalg.eigvalsh(cov)
    eigenvalues = np.sort(np.maximum(eigenvalues, 1e-9))[::-1]  # lambda_1 >= lambda_2 >= lambda_3

    total = np.sum(eigenvalues)
    p = eigenvalues / total

    # Shannon entropy of spatial dispersion: H = - sum(p_i * log(p_i))
    entropy = -float(np.sum(p * np.log(p + 1e-12))) / np.log(3.0)
    return float(np.clip(entropy, 0.0, 1.0))

class ConfidenceEngine:
    def __init__(self, model_path: Optional[str] = None):
        """
        Initializes the ONNX Runtime session using CPUExecutionProvider.
        """
        if model_path is None:
            # Default to local confidence_model.onnx
            base_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.join(base_dir, "confidence_model.onnx")

        self.model_path = model_path
        self.session = None

        if os.path.exists(model_path):
            opts = ort.SessionOptions()
            opts.intra_op_num_threads = 2  # Efficient on 8-core / 16-thread CPU
            opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            self.session = ort.InferenceSession(
                model_path,
                sess_options=opts,
                providers=['CPUExecutionProvider']
            )
            self.input_name = self.session.get_inputs()[0].name
        else:
            raise FileNotFoundError(f"ONNX model file not found at: {model_path}")

    def normalize_inputs(
        self,
        sharpness: float,
        feature_count: int,
        planar_entropy: float
    ) -> np.ndarray:
        """
        Normalizes raw sensor metrics:
        - Sharpness: Laplacian variance normalized [0, 500] -> [0.0, 1.0]
        - Feature Count: Optical flow tracks [0, 300] -> [0.0, 1.0]
        - Planar Entropy: Already [0.0, 1.0]
        """
        sharp_norm = float(np.clip(sharpness / 400.0, 0.0, 1.0))
        feat_norm = float(np.clip(feature_count / 250.0, 0.0, 1.0))
        entropy_norm = float(np.clip(planar_entropy, 0.0, 1.0))

        return np.array([[sharp_norm, feat_norm, entropy_norm]], dtype=np.float32)

    def evaluate(
        self,
        sharpness: float,
        feature_count: int,
        planar_entropy: float
    ) -> ConfidenceResult:
        """
        Runs low-latency ONNX CPU inference to estimate localization trust and position variance.
        """
        start_t = time.perf_counter()

        input_tensor = self.normalize_inputs(sharpness, feature_count, planar_entropy)

        # ONNX Runtime CPU Inference
        outputs = self.session.run(None, {self.input_name: input_tensor})
        raw_trust = float(outputs[0][0][0])
        raw_var = outputs[1][0]

        latency_ms = (time.perf_counter() - start_t) * 1000.0

        # Heuristic calibration curve for realistic boundary behavior:
        # High sharpness & features with structured LiDAR yields C_loc > 0.85
        # Low sharpness / optical tracks yields degradation
        sharp_norm = float(input_tensor[0, 0])
        feat_norm = float(input_tensor[0, 1])
        ent_norm = float(input_tensor[0, 2])

        # Composite fused confidence from physical sensor diagnostics
        composite_trust = 0.45 * sharp_norm + 0.40 * feat_norm + 0.15 * (1.0 - ent_norm)
        
        # Fuse neural model output with composite sensor diagnostics
        fused_trust = float(np.clip(0.3 * (raw_trust * composite_trust) + 0.7 * composite_trust, 0.0, 1.0))

        # Dynamic 3D variance (m^2) inversely proportional to trust
        var_scale = (1.0 - fused_trust) ** 2 * 12.0 + 0.02
        pos_var = (
            float(raw_var[0] * 0.1 + var_scale),
            float(raw_var[1] * 0.06 + var_scale * 0.6),
            float(raw_var[2] * 0.1 + var_scale * 1.2)
        )

        return ConfidenceResult(
            trust_score=round(fused_trust, 4),
            position_variance=(round(pos_var[0], 4), round(pos_var[1], 4), round(pos_var[2], 4)),
            sharpness_norm=round(sharp_norm, 3),
            feature_count_norm=round(feat_norm, 3),
            planar_entropy=round(ent_norm, 3),
            inference_latency_ms=round(latency_ms, 3)
        )
