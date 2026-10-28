import React from 'react';

export default function RightSidebar({
  trustScore,
  isDegraded,
  onToggleDust,
  adaptiveSensors,
  activeDrift,
  batteryLevel,
  reserveLevel
}) {
  const isCritical = trustScore < 40;
  const isCaution = trustScore >= 40 && trustScore < 70;
  const trustColor = isCritical ? '#f43f5e' : isCaution ? '#f59e0b' : '#10b981';
  const trustText = isCritical ? 'CRITICAL UNCERTAINTY' : isCaution ? 'MODERATE UNCERTAINTY' : 'HIGH TRUST';

  // SVG circular gauge calculation
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (trustScore / 100) * circumference;

  return (
    <aside style={{
      width: '280px',
      backgroundColor: '#090d16',
      borderLeft: '1px solid #1e293b',
      padding: '14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      overflowY: 'auto',
      zIndex: 20
    }}>
      {/* Pillar 1: Uncertainty-Aware Localization Confidence */}
      <div style={{
        backgroundColor: '#020617',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        padding: '12px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '8px',
          borderBottom: '1px solid #1e293b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: trustColor,
              boxShadow: `0 0 8px ${trustColor}`
            }}></span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase' }}>
              Trust Score
            </span>
          </div>
          <span style={{
            fontSize: '9px',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: isCritical ? '#881337' : '#064e3b',
            color: trustColor,
            border: `1px solid ${trustColor}`
          }}>
            {trustText}
          </span>
        </div>

        {/* Circular Gauge and Big Metric */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
              <span style={{ fontSize: '32px', fontWeight: 900, color: trustColor }} className="font-mono">
                {trustScore}
              </span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: trustColor }}>%</span>
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>
              Pose Reliability Index
            </div>
          </div>

          <div style={{ position: 'relative', width: '68px', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="68" height="68" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="34"
                cy="34"
                r={radius}
                stroke="#1e293b"
                strokeWidth="5"
                fill="transparent"
              />
              <circle
                cx="34"
                cy="34"
                r={radius}
                stroke={trustColor}
                strokeWidth="5"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.5s ease' }}
              />
            </svg>
            <span style={{ position: 'absolute', fontSize: '10px', fontWeight: 800, color: '#cbd5e1' }} className="font-mono">
              SLAM
            </span>
          </div>
        </div>

        {/* Breakdown Telemetry */}
        <div style={{
          marginTop: '10px',
          padding: '8px',
          backgroundColor: '#090d16',
          borderRadius: '6px',
          border: '1px solid #1e293b',
          fontSize: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }} className="font-mono">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>VIO Optical Tracks:</span>
            <span style={{ color: isDegraded ? '#f43f5e' : '#e2e8f0', fontWeight: 700 }}>
              {isDegraded ? '38 (LOST)' : '246 tracks'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>LiDAR ICP Residual:</span>
            <span style={{ color: isDegraded ? '#f59e0b' : '#10b981', fontWeight: 700 }}>
              {isDegraded ? '0.084 m' : '0.016 m'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Active Drift Rate:</span>
            <span style={{ color: isDegraded ? '#f43f5e' : '#10b981', fontWeight: 700 }}>
              {activeDrift}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #1e293b', paddingTop: '4px', marginTop: '2px' }}>
            <span style={{ color: '#64748b' }}>Auto-Abort Floor:</span>
            <span style={{ color: '#f43f5e', fontWeight: 700 }}>&lt; 40% Trust</span>
          </div>
        </div>
      </div>

      {/* Pillar 2: Adaptive Sensing Matrix */}
      <div style={{
        backgroundColor: '#020617',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        padding: '12px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '8px',
          borderBottom: '1px solid #1e293b'
        }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase' }}>
            Adaptive Sensor Matrix
          </span>
          <span style={{ fontSize: '9px', color: '#06b6d4', fontWeight: 700 }} className="font-mono">
            AUTO-FAILOVER
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
          {adaptiveSensors.map((sensor, idx) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 8px',
              backgroundColor: '#090d16',
              borderRadius: '6px',
              border: '1px solid #1e293b',
              fontSize: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '4px',
                  backgroundColor: sensor.iconBg,
                  color: sensor.iconColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '9px'
                }}>
                  {sensor.tag}
                </span>
                <div>
                  <div style={{ fontWeight: 700, color: '#f1f5f9' }}>{sensor.name}</div>
                  <div style={{ fontSize: '9px', color: '#64748b' }}>{sensor.sub}</div>
                </div>
              </div>

              <span style={{
                fontSize: '9px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: sensor.statusBg,
                color: sensor.statusColor,
                border: `1px solid ${sensor.statusBorder}`
              }} className="font-mono">
                {sensor.status}
              </span>
            </div>
          ))}
        </div>

        {/* Degradation Alert Banner */}
        {isDegraded && (
          <div style={{
            marginTop: '8px',
            padding: '8px',
            backgroundColor: '#451a03',
            border: '1px solid #f59e0b',
            borderRadius: '6px',
            color: '#fef3c7',
            fontSize: '10px'
          }}>
            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>⚠️ SENSOR FAILOVER ENGAGED</span>
            </div>
            <div style={{ marginTop: '2px', color: '#fde68a' }}>
              Optical VIO degraded by smoke. Switched primary odometry to 3D LiDAR + LWIR Thermal fusion.
            </div>
          </div>
        )}
      </div>

      {/* Interactive Simulation Trigger Button */}
      <div style={{ marginTop: 'auto' }}>
        <button
          onClick={onToggleDust}
          style={{
            width: '100%',
            backgroundColor: isDegraded ? '#1e293b' : 'rgba(245, 158, 11, 0.15)',
            border: isDegraded ? '1px solid #475569' : '1px solid #f59e0b',
            color: isDegraded ? '#cbd5e1' : '#fbbf24',
            padding: '10px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
        >
          <span>{isDegraded ? '↺' : '⚠️'}</span>
          <span>{isDegraded ? 'RESET NOMINAL AIRFLOW' : 'SIMULATE DUST INRUSH'}</span>
        </button>
      </div>
    </aside>
  );
}
