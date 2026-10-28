import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import LeftSidebar from './components/LeftSidebar';
import CenterViewport from './components/CenterViewport';
import RightSidebar from './components/RightSidebar';
import BottomDeck from './components/BottomDeck';

export default function App() {
  const [missionProfile, setMissionProfile] = useState('tunnel');
  const [flightMode, setFlightMode] = useState('EXPLORE');
  const [isDegraded, setIsDegraded] = useState(false);
  const socketRef = useRef(null);

  // Atmospheric and Telemetry states
  const [coGas, setCoGas] = useState(4.2);
  const [tremor, setTremor] = useState(14.2);
  const [smoke, setSmoke] = useState(18);
  const [depth, setDepth] = useState(0.0);
  const [velocity, setVelocity] = useState(0.85);
  const [trustScore, setTrustScore] = useState(94);
  const [batteryLevel, setBatteryLevel] = useState(68);

  // Connect to live FastAPI Telemetry Relay Engine
  useEffect(() => {
    let ws;
    let reconnectTimer;

    const connectWS = () => {
      try {
        ws = new WebSocket('ws://localhost:8000/ws/telemetry');
        socketRef.current = ws;

        ws.onopen = () => {
          console.log('[EchoNest GCS] Connected to Live SITL / ROS 2 Telemetry Relay');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.position) {
              setDepth(data.position.z);
            }
            if (data.gas_ppm !== undefined) setCoGas(data.gas_ppm);
            if (data.tremor_db !== undefined) setTremor(data.tremor_db);
            if (data.smoke_pct !== undefined) setSmoke(data.smoke_pct);
            if (data.trust_score !== undefined) {
              setTrustScore(Math.round(data.trust_score));
              setIsDegraded(data.trust_score < 40 || (data.sensor_mode && data.sensor_mode.includes('THERMAL')));
            }
            if (data.battery_pct !== undefined) setBatteryLevel(Math.round(data.battery_pct));
            if (data.flight_mode) {
              setFlightMode(data.flight_mode === 'RTH' ? 'RTH' : (data.flight_mode === 'HOLD' ? 'HOLD' : 'EXPLORE'));
            }
          } catch (err) {
            console.error('Failed to parse telemetry packet:', err);
          }
        };

        ws.onclose = () => {
          console.warn('[EchoNest GCS] WebSocket disconnected. Reconnecting in 2s...');
          reconnectTimer = setTimeout(connectWS, 2000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (e) {
        reconnectTimer = setTimeout(connectWS, 2000);
      }
    };

    connectWS();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  // Milestones list
  const [milestones, setMilestones] = useState([
    { title: 'Entry Portal Alpha', time: 'T+01:15', desc: 'GPS signal lost. Autonomous VIO/LiDAR handover nominal.', color: '#10b981' },
    { title: 'Narrow Chokepoint', time: 'T+04:40', desc: '1.2m aperture. Speed auto-lowered to 0.4 m/s.', color: '#f59e0b' },
    { title: 'Structural Vault', time: 'T+07:10', desc: 'Active frontier scanning. Structural integrity 94%.', color: '#06b6d4' }
  ]);

  // Dynamic Adaptive Sensor Matrix state
  const adaptiveSensors = [
    {
      name: '3D Solid-State LiDAR',
      sub: 'Frontier geometry & point-cloud',
      tag: 'L',
      iconBg: 'rgba(6, 182, 212, 0.2)',
      iconColor: '#22d3ee',
      status: 'ACTIVE',
      statusBg: '#083344',
      statusColor: '#38bdf8',
      statusBorder: '#0e7490'
    },
    {
      name: 'VIO Stereo Optical',
      sub: 'Visual-inertial feature odometry',
      tag: 'V',
      iconBg: isDegraded ? 'rgba(244, 63, 94, 0.2)' : 'rgba(16, 185, 129, 0.2)',
      iconColor: isDegraded ? '#f43f5e' : '#10b981',
      status: isDegraded ? 'DEGRADED' : 'LOCKED',
      statusBg: isDegraded ? '#881337' : '#064e3b',
      statusColor: isDegraded ? '#f43f5e' : '#10b981',
      statusBorder: isDegraded ? '#f43f5e' : '#10b981'
    },
    {
      name: 'Long-Wave Thermal IR',
      sub: 'Zero-light dust penetration',
      tag: 'T',
      iconBg: isDegraded ? 'rgba(168, 85, 247, 0.25)' : 'rgba(100, 116, 139, 0.2)',
      iconColor: isDegraded ? '#c084fc' : '#94a3b8',
      status: isDegraded ? 'ENGAGED (PRIMARY)' : 'STANDBY',
      statusBg: isDegraded ? '#581c87' : '#1e293b',
      statusColor: isDegraded ? '#e9d5ff' : '#94a3b8',
      statusBorder: isDegraded ? '#a855f7' : '#334155'
    },
    {
      name: 'Acoustic / Echo Proximity',
      sub: 'Obscuration safety barrier',
      tag: 'A',
      iconBg: isDegraded ? 'rgba(245, 158, 11, 0.2)' : 'rgba(100, 116, 139, 0.2)',
      iconColor: isDegraded ? '#fbbf24' : '#94a3b8',
      status: isDegraded ? 'ACTIVE' : 'STANDBY',
      statusBg: isDegraded ? '#451a03' : '#1e293b',
      statusColor: isDegraded ? '#fbbf24' : '#94a3b8',
      statusBorder: isDegraded ? '#f59e0b' : '#334155'
    }
  ];

  // Toggle "Simulate Dust Inrush" (Core Technical Requirement)
  const handleToggleDust = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ command: isDegraded ? "RESET_NOMINAL" : "SIMULATE_DUST" }));
    }

    if (!isDegraded) {
      setIsDegraded(true);
      setTrustScore(25);
      setSmoke(84);
      setCoGas(26.4);
      setTremor(22.8);
      setVelocity(0.35);

      setMilestones(prev => [
        {
          title: '⚠️ Dust Inrush Encountered',
          time: 'T+08:12',
          desc: 'Optical VIO lost. Switched odometry to 3D LiDAR + LWIR Thermal fusion.',
          color: '#f43f5e'
        },
        ...prev
      ]);
    } else {
      setIsDegraded(false);
      setTrustScore(94);
      setSmoke(18);
      setCoGas(4.2);
      setTremor(14.2);
      setVelocity(0.85);

      setMilestones(prev => [
        {
          title: 'Nominal Airflow Restored',
          time: 'T+09:05',
          desc: 'VIO feature lock re-established. 248 visual tracks nominal.',
          color: '#10b981'
        },
        ...prev
      ]);
    }
  };

  // Safe Return (RTH) trigger
  const handleEmergencyRTH = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ command: "RTH" }));
    }
    setFlightMode('RTH');
    alert(
      `[SAFE RETURN (RTH) ENGAGED]\n\n` +
      `EchoNest is executing autonomous backtracking along the highest-confidence green breadcrumb corridor.\n` +
      `All obstacle collision avoidance and return-trip reserves locked.`
    );
  };

  // Pin-Drop Waypoint handler
  const handlePinDrop = (coords) => {
    setMilestones(prev => [
      {
        title: `📍 Waypoint [X:${coords.x.toFixed(1)}, Y:${coords.y.toFixed(1)}, Z:${coords.z.toFixed(1)}]`,
        time: 'JUST NOW',
        desc: 'Subterranean inspection target pinned by operator.',
        color: '#f43f5e'
      },
      ...prev
    ]);
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#020617',
      color: '#f8fafc',
      overflow: 'hidden'
    }}>
      {/* Top Header */}
      <Header
        missionProfile={missionProfile}
        setMissionProfile={setMissionProfile}
        navState={flightMode === 'RTH' ? 'RTH BACKTRACK' : isDegraded ? 'ADAPTIVE SLAM' : 'AUTONOMOUS SLAM'}
        trustScore={trustScore}
        onEmergencyRTH={handleEmergencyRTH}
      />

      {/* Main 3-Panel Cockpit Body */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
        {/* Left Panel: Atmospheric Telemetry */}
        <LeftSidebar
          coGas={coGas}
          tremor={tremor}
          smoke={smoke}
          depth={depth}
          velocity={velocity}
          isDegraded={isDegraded}
          milestones={milestones}
        />

        {/* Center Viewport: Three.js 3D Point-Cloud Visualizer */}
        <CenterViewport
          trustScore={trustScore}
          isDegraded={isDegraded}
          depth={depth}
          onPinDrop={handlePinDrop}
        />

        {/* Right Panel: Uncertainty-Aware Trust & Adaptive Sensor Matrix */}
        <RightSidebar
          trustScore={trustScore}
          isDegraded={isDegraded}
          onToggleDust={handleToggleDust}
          adaptiveSensors={adaptiveSensors}
          activeDrift={isDegraded ? '0.28 m/min (HIGH)' : '0.02 m/min (NOMINAL)'}
          batteryLevel={65}
          reserveLevel={30}
        />
      </div>

      {/* Bottom Deck Controls */}
      <BottomDeck
        flightMode={flightMode}
        setFlightMode={setFlightMode}
        onEmergencyRTH={handleEmergencyRTH}
        totalVoxels={isDegraded ? 1845000 : 2140000}
        originDistance={depth}
      />
    </div>
  );
}
