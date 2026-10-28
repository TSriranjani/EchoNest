import React from 'react';

export default function BottomDeck({
  flightMode,
  setFlightMode,
  onEmergencyRTH,
  totalVoxels,
  originDistance
}) {
  return (
    <footer style={{
      backgroundColor: '#090d16',
      borderTop: '1px solid #1e293b',
      padding: '10px 18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 30
    }}>
      {/* Flight Control Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={() => setFlightMode('EXPLORE')}
          style={{
            backgroundColor: flightMode === 'EXPLORE' ? '#0891b2' : '#1e293b',
            color: '#ffffff',
            border: flightMode === 'EXPLORE' ? '1px solid #22d3ee' : '1px solid #334155',
            borderRadius: '6px',
            padding: '8px 14px',
            fontSize: '11px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: flightMode === 'EXPLORE' ? '0 0 10px rgba(6, 182, 212, 0.4)' : 'none'
          }}
        >
          <span>▶</span>
          <span>AUTONOMOUS EXPLORE</span>
        </button>

        <button
          onClick={() => setFlightMode('HOLD')}
          style={{
            backgroundColor: flightMode === 'HOLD' ? '#d97706' : '#1e293b',
            color: '#ffffff',
            border: flightMode === 'HOLD' ? '1px solid #fbbf24' : '1px solid #334155',
            borderRadius: '6px',
            padding: '8px 14px',
            fontSize: '11px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: flightMode === 'HOLD' ? '0 0 10px rgba(245, 158, 11, 0.4)' : 'none'
          }}
        >
          <span>⏸</span>
          <span>HOLD POSITION</span>
        </button>

        <button
          onClick={onEmergencyRTH}
          style={{
            backgroundColor: flightMode === 'RTH' ? '#be123c' : '#1e293b',
            color: '#ffffff',
            border: flightMode === 'RTH' ? '1px solid #f43f5e' : '1px solid #334155',
            borderRadius: '6px',
            padding: '8px 14px',
            fontSize: '11px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: flightMode === 'RTH' ? '0 0 10px rgba(244, 63, 94, 0.4)' : 'none'
          }}
        >
          <span>↺</span>
          <span>SAFE RETURN (RTH)</span>
        </button>
      </div>

      {/* Real-time Subterranean Telemetry Stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '11px', color: '#94a3b8' }} className="font-mono">
        <div>
          <span>SCANNED VOXELS: </span>
          <strong style={{ color: '#22d3ee' }}>{totalVoxels.toLocaleString()}</strong>
        </div>
        <div>
          <span>PORTAL DISTANCE: </span>
          <strong style={{ color: '#10b981' }}>{originDistance.toFixed(1)} m</strong>
        </div>
        <div>
          <span>SLAM STATUS: </span>
          <strong style={{ color: '#38bdf8' }}>ACTIVE BACKTRACK READY</strong>
        </div>
      </div>
    </footer>
  );
}
