import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

export default function CenterViewport({
  trustScore,
  isDegraded,
  depth,
  onPinDrop
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // Tooltip state for screen click coordinates
  const [tooltip, setTooltip] = useState(null); // { x, y, localX, localY, localZ }
  const [cameraView, setCameraView] = useState('3d'); // '3d' | 'top' | 'side'

  // References to keep Three.js entities accessible without re-renders
  const threeRefs = useRef({
    scene: null,
    camera: null,
    renderer: null,
    uncertaintyMesh: null,
    droneGroup: null,
    pinMesh: null,
    animId: null,
    isInteracting: false,
    prevPointer: { x: 0, y: 0 },
    spherical: { radius: 35, phi: Math.PI / 3, theta: Math.PI / 4 },
    target: new THREE.Vector3(0, 0, 0)
  });

  // Initialize and manage Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    threeRefs.current.scene = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 800);
    threeRefs.current.camera = camera;

    // 3. High-Performance WebGL Renderer (optimized for Integrated Radeon GPU)
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Cap at 1.5 to guarantee 60 FPS on integrated GPU
    threeRefs.current.renderer = renderer;

    // 4. Generate Curved Subterranean Tunnel Point Cloud
    const tunnelRings = 40;
    const pointsPerRing = 48;
    const totalPoints = tunnelRings * pointsPerRing + 1200; // ~3,100 points, extremely lightweight

    const positions = new Float32Array(totalPoints * 3);
    const colors = new Float32Array(totalPoints * 3);

    let idx = 0;
    const pathPoints = [];

    // Construct curved tunnel trajectory
    for (let i = 0; i < tunnelRings; i++) {
      const t = i / (tunnelRings - 1);
      // Gentle subterranean S-curve
      const cx = Math.sin(t * Math.PI * 1.8) * 12;
      const cy = Math.cos(t * Math.PI * 1.2) * 3 - 2;
      const cz = (t - 0.5) * 60;
      pathPoints.push(new THREE.Vector3(cx, cy, cz));

      const ringRadius = 4.2 + Math.sin(i * 0.4) * 0.4;

      for (let j = 0; j < pointsPerRing; j++) {
        const angle = (j / pointsPerRing) * Math.PI * 2;
        const noise = (Math.random() - 0.5) * 0.4;
        const px = cx + Math.cos(angle) * (ringRadius + noise);
        const py = cy + Math.sin(angle) * (ringRadius + noise);
        const pz = cz + (Math.random() - 0.5) * 0.5;

        positions[idx * 3] = px;
        positions[idx * 3 + 1] = py;
        positions[idx * 3 + 2] = pz;

        // Depth-coded coloring: Cyan near entrance transitioning to deep steel blue
        const depthFactor = 1 - t;
        colors[idx * 3] = 0.05 + depthFactor * 0.15;
        colors[idx * 3 + 1] = 0.45 + depthFactor * 0.45;
        colors[idx * 3 + 2] = 0.65 + depthFactor * 0.35;
        idx++;
      }
    }

    // Floor rubble and particulate voxels
    for (let k = 0; k < 1200; k++) {
      const randT = Math.random();
      const ptIdx = Math.floor(randT * (pathPoints.length - 1));
      const pt = pathPoints[ptIdx];
      positions[idx * 3] = pt.x + (Math.random() - 0.5) * 6;
      positions[idx * 3 + 1] = pt.y - 3.8 + Math.random() * 0.6;
      positions[idx * 3 + 2] = pt.z + (Math.random() - 0.5) * 4;

      colors[idx * 3] = 0.08;
      colors[idx * 3 + 1] = 0.55;
      colors[idx * 3 + 2] = 0.75;
      idx++;
    }

    const pointGeometry = new THREE.BufferGeometry();
    pointGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const pointMaterial = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    });

    const pointCloud = new THREE.Points(pointGeometry, pointMaterial);
    scene.add(pointCloud);

    // 5. Green Breadcrumb Path (Safe Corridor)
    const breadcrumbGeometry = new THREE.BufferGeometry().setFromPoints(pathPoints);
    const breadcrumbMaterial = new THREE.LineBasicMaterial({
      color: 0x10b981,
      linewidth: 2,
      transparent: true,
      opacity: 0.95
    });
    const breadcrumbLine = new THREE.Line(breadcrumbGeometry, breadcrumbMaterial);
    scene.add(breadcrumbLine);

    // 6. Drone Beacon at leading edge of exploration
    const dronePos = pathPoints[Math.floor(pathPoints.length * 0.68)];
    threeRefs.current.target.copy(dronePos);

    const droneGroup = new THREE.Group();
    droneGroup.position.copy(dronePos);

    // Drone body mesh (tactical quadcopter body)
    const bodyGeo = new THREE.BoxGeometry(0.8, 0.2, 0.8);
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
    const droneMesh = new THREE.Mesh(bodyGeo, bodyMat);
    droneGroup.add(droneMesh);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.4, 8);
    const armMat = new THREE.MeshBasicMaterial({ color: 0x64748b });
    const arm1 = new THREE.Mesh(armGeo, armMat);
    arm1.rotation.z = Math.PI / 4;
    arm1.rotation.y = Math.PI / 4;
    const arm2 = new THREE.Mesh(armGeo, armMat);
    arm2.rotation.z = Math.PI / 4;
    arm2.rotation.y = -Math.PI / 4;
    droneGroup.add(arm1);
    droneGroup.add(arm2);

    scene.add(droneGroup);
    threeRefs.current.droneGroup = droneGroup;

    // 7. Amber Uncertainty Covariance Ellipse (Core Research Feature)
    const uncGeo = new THREE.SphereGeometry(1, 16, 12);
    const uncMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    const uncertaintyMesh = new THREE.Mesh(uncGeo, uncMat);
    uncertaintyMesh.position.copy(dronePos);
    scene.add(uncertaintyMesh);
    threeRefs.current.uncertaintyMesh = uncertaintyMesh;

    // 8. Pin-drop marker mesh (Initially hidden)
    const pinGeo = new THREE.ConeGeometry(0.4, 1.2, 8);
    const pinMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    const pinMesh = new THREE.Mesh(pinGeo, pinMat);
    pinMesh.rotation.x = Math.PI; // point downward
    pinMesh.visible = false;
    scene.add(pinMesh);
    threeRefs.current.pinMesh = pinMesh;

    // 9. Camera Position Update
    const updateCameraPos = () => {
      const { spherical, target, camera } = threeRefs.current;
      camera.position.x = target.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = target.y + spherical.radius * Math.cos(spherical.phi);
      camera.position.z = target.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(target);
    };
    updateCameraPos();

    // 10. Animation Loop (Maintains solid 60 FPS)
    let clock = new THREE.Clock();

    const animate = () => {
      threeRefs.current.animId = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();

      // Drone subtle hovering animation
      if (threeRefs.current.droneGroup) {
        threeRefs.current.droneGroup.position.y = dronePos.y + Math.sin(elapsed * 3) * 0.15;
      }

      // Rotate pin drop marker if active
      if (threeRefs.current.pinMesh && threeRefs.current.pinMesh.visible) {
        threeRefs.current.pinMesh.rotation.y = elapsed * 2;
      }

      renderer.render(scene, camera);
    };
    animate();

    // 11. Resize handling
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 12. Cleanup (Guarantees zero memory leaks & context loss)
    return () => {
      if (threeRefs.current.animId) {
        cancelAnimationFrame(threeRefs.current.animId);
      }
      resizeObserver.disconnect();

      // Dispose Geometries and Materials
      pointGeometry.dispose();
      pointMaterial.dispose();
      breadcrumbGeometry.dispose();
      breadcrumbMaterial.dispose();
      bodyGeo.dispose();
      bodyMat.dispose();
      armGeo.dispose();
      armMat.dispose();
      uncGeo.dispose();
      uncMat.dispose();
      pinGeo.dispose();
      pinMat.dispose();

      renderer.dispose();
      scene.clear();
    };
  }, []);

  // Dynamically adapt Uncertainty Covariance Ellipse based on Trust Score & Degradation
  useEffect(() => {
    const mesh = threeRefs.current.uncertaintyMesh;
    if (!mesh) return;

    if (isDegraded || trustScore < 40) {
      // Degraded / Dust Inrush: Ellipse expands drastically, turns crimson/amber
      mesh.scale.set(4.2, 2.4, 4.2);
      mesh.material.color.setHex(0xf43f5e);
      mesh.material.opacity = 0.55;
    } else if (trustScore < 70) {
      // Moderate uncertainty
      mesh.scale.set(2.0, 1.2, 2.0);
      mesh.material.color.setHex(0xf59e0b);
      mesh.material.opacity = 0.35;
    } else {
      // High Trust Nominal
      mesh.scale.set(0.9, 0.55, 0.9);
      mesh.material.color.setHex(0x10b981);
      mesh.material.opacity = 0.25;
    }
  }, [trustScore, isDegraded]);

  // Camera preset modes
  const setPresetView = (mode) => {
    setCameraView(mode);
    const { spherical } = threeRefs.current;
    if (mode === '3d') {
      spherical.radius = 35;
      spherical.phi = Math.PI / 3;
      spherical.theta = Math.PI / 4;
    } else if (mode === 'top') {
      spherical.radius = 45;
      spherical.phi = 0.05; // straight down
      spherical.theta = 0;
    } else if (mode === 'side') {
      spherical.radius = 35;
      spherical.phi = Math.PI / 2;
      spherical.theta = Math.PI / 2;
    }

    const { target, camera } = threeRefs.current;
    if (camera) {
      camera.position.x = target.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = target.y + spherical.radius * Math.cos(spherical.phi);
      camera.position.z = target.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(target);
    }
  };

  // Pointer Interaction Handlers for Camera Orbit
  const handlePointerDown = (e) => {
    threeRefs.current.isInteracting = true;
    threeRefs.current.prevPointer = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e) => {
    if (!threeRefs.current.isInteracting) return;
    const deltaX = e.clientX - threeRefs.current.prevPointer.x;
    const deltaY = e.clientY - threeRefs.current.prevPointer.y;
    threeRefs.current.prevPointer = { x: e.clientX, y: e.clientY };

    const { spherical, target, camera } = threeRefs.current;
    spherical.theta -= deltaX * 0.008;
    spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi - deltaY * 0.008));

    if (camera) {
      camera.position.x = target.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = target.y + spherical.radius * Math.cos(spherical.phi);
      camera.position.z = target.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(target);
    }
  };

  const handlePointerUp = () => {
    threeRefs.current.isInteracting = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const { spherical, target, camera } = threeRefs.current;
    spherical.radius = Math.max(10, Math.min(80, spherical.radius + e.deltaY * 0.03));
    if (camera) {
      camera.position.x = target.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = target.y + spherical.radius * Math.cos(spherical.phi);
      camera.position.z = target.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(target);
    }
  };

  // Screen Click to Local (X, Y, Z) Subterranean Coordinates
  const handleCanvasClick = (e) => {
    const container = containerRef.current;
    if (!container || !threeRefs.current.camera) return;

    const rect = container.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Normalized Device Coordinates (-1 to +1)
    const mouse = new THREE.Vector2(
      (clientX / rect.width) * 2 - 1,
      -(clientY / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, threeRefs.current.camera);

    // Raycast onto subterranean horizontal floor plane (y = -3.8)
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 3.8);
    const intersectPoint = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(floorPlane, intersectPoint);

    if (hit) {
      // Subterranean coordinate frame relative to tunnel portal:
      // X = lateral offset (m)
      // Y = floor clearance (m)
      // Z = depth from portal (m)
      const localX = intersectPoint.x;
      const localY = 1.2; // default safe flight clearance
      const localZ = Math.abs(intersectPoint.z - 30.0) + 120.0; // depth in tunnel

      // Position 3D Pin Drop mesh
      if (threeRefs.current.pinMesh) {
        threeRefs.current.pinMesh.position.set(intersectPoint.x, intersectPoint.y + 1.2, intersectPoint.z);
        threeRefs.current.pinMesh.visible = true;
      }

      setTooltip({
        screenX: clientX,
        screenY: clientY,
        localX: localX.toFixed(2),
        localY: localY.toFixed(2),
        localZ: localZ.toFixed(2)
      });

      if (onPinDrop) {
        onPinDrop({ x: localX, y: localY, z: localZ });
      }
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        position: 'relative',
        backgroundColor: '#020617',
        overflow: 'hidden',
        cursor: 'crosshair'
      }}
      className="tactical-grid"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      onClick={handleCanvasClick}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />

      {/* Top HUD Overlay */}
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '14px',
        backgroundColor: 'rgba(9, 13, 22, 0.85)',
        backdropFilter: 'blur(6px)',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '11px',
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }} className="font-mono">
        <div style={{ color: '#94a3b8' }}>
          TUNNEL DEPTH: <strong style={{ color: '#22d3ee' }}>{depth.toFixed(1)} m</strong>
        </div>
        <div style={{ color: '#94a3b8' }}>
          CEILING CLEARANCE: <strong style={{ color: '#10b981' }}>2.8 m</strong>
        </div>
        <div style={{ color: '#94a3b8' }}>
          POINT-CLOUD DENSITY: <strong style={{ color: '#e2e8f0' }}>2,480 pts/m³</strong>
        </div>
        <div style={{ color: '#94a3b8' }}>
          LOCAL COVARIANCE: <strong style={{ color: isDegraded ? '#f43f5e' : '#f59e0b' }}>
            {isDegraded ? '±4.20m (EXPANDED)' : '±0.85m (BOUNDED)'}
          </strong>
        </div>
      </div>

      {/* View Presets Bar */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '14px',
        display: 'flex',
        gap: '6px',
        zIndex: 10
      }}>
        <button
          onClick={(e) => { e.stopPropagation(); setPresetView('3d'); }}
          style={{
            backgroundColor: cameraView === '3d' ? '#0891b2' : 'rgba(15, 23, 42, 0.85)',
            color: '#ffffff',
            border: cameraView === '3d' ? '1px solid #22d3ee' : '1px solid #334155',
            borderRadius: '4px',
            padding: '5px 10px',
            fontSize: '10px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          3D ORBIT
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setPresetView('top'); }}
          style={{
            backgroundColor: cameraView === 'top' ? '#0891b2' : 'rgba(15, 23, 42, 0.85)',
            color: '#ffffff',
            border: cameraView === 'top' ? '1px solid #22d3ee' : '1px solid #334155',
            borderRadius: '4px',
            padding: '5px 10px',
            fontSize: '10px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          TOP-DOWN 2D
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setPresetView('side'); }}
          style={{
            backgroundColor: cameraView === 'side' ? '#0891b2' : 'rgba(15, 23, 42, 0.85)',
            color: '#ffffff',
            border: cameraView === 'side' ? '1px solid #22d3ee' : '1px solid #334155',
            borderRadius: '4px',
            padding: '5px 10px',
            fontSize: '10px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          CROSS-SECTION
        </button>
      </div>

      {/* Bottom Map Legend */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '14px',
        backgroundColor: 'rgba(9, 13, 22, 0.85)',
        backdropFilter: 'blur(6px)',
        border: '1px solid #1e293b',
        borderRadius: '6px',
        padding: '6px 12px',
        fontSize: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        pointerEvents: 'none'
      }} className="font-mono">
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22d3ee' }}></span>
          <span style={{ color: '#cbd5e1' }}>LiDAR Voxels</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
          <span style={{ color: '#cbd5e1' }}>Safe Breadcrumb Trail</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isDegraded ? '#f43f5e' : '#f59e0b' }}></span>
          <span style={{ color: '#cbd5e1' }}>Uncertainty Ellipse</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f43f5e' }}></span>
          <span style={{ color: '#cbd5e1' }}>Pin-Drop Target</span>
        </div>
      </div>

      {/* Interactive Pin-Drop Tooltip Overlay */}
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: `${tooltip.screenX}px`,
            top: `${tooltip.screenY - 70}px`,
            transform: 'translateX(-50%)',
            backgroundColor: '#090d16',
            border: '1px solid #f43f5e',
            boxShadow: '0 0 12px rgba(244, 63, 94, 0.4)',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '10px',
            zIndex: 40,
            pointerEvents: 'auto'
          }}
          className="font-mono"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ color: '#f43f5e', fontWeight: 800 }}>📍 LOCAL COORD PIN</span>
            <button
              onClick={(e) => { e.stopPropagation(); setTooltip(null); }}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '10px' }}
            >
              ✕
            </button>
          </div>
          <div style={{ color: '#f1f5f9', marginTop: '3px' }}>
            X: <strong style={{ color: '#38bdf8' }}>{tooltip.localX}m</strong> | Y: <strong style={{ color: '#10b981' }}>{tooltip.localY}m</strong> | Depth: <strong style={{ color: '#fbbf24' }}>{tooltip.localZ}m</strong>
          </div>
          <div style={{ marginTop: '5px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                alert(`[WAYPOINT SET]\nCoordinates: X=${tooltip.localX}m, Y=${tooltip.localY}m, Z=${tooltip.localZ}m\nFrontier waypoint uploaded to EchoNest flight plan.`);
              }}
              style={{
                backgroundColor: '#be123c',
                color: '#ffffff',
                border: 'none',
                borderRadius: '3px',
                padding: '3px 8px',
                fontSize: '9px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              DISPATCH TO WAYPOINT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
