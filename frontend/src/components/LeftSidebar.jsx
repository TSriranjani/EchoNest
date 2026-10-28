import React from 'react';

export default function LeftSidebar({
  coGas,
  tremor,
  smoke,
  depth,
  velocity,
  isDegraded,
  milestones
}) {
  return (
    <aside style={{
      width: '280px',
      backgroundColor: '#090d16',
      borderRight: '1px solid #1e293b',
      padding: '14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      overflowY: 'auto',
      zIndex: 20
    }}>
      {/* Panel Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '8px',
        borderBottom: '1px solid #1e293b'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#06b6d4' }}></span>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#e2e8f0', textTransform: 'uppercase' }}>
            Atmospheric & Hazard
          </span>
        </div>
        <span style={{ fontSize: '10px', color: '#38bdf8', backgroundColor: '#083344', padding: '2px 6px', borderRadius: '4px' }} className="font-mono">
          CALIBRATED
        </span>
      </div>

      {/* Grid of Atmospheric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        
        {/* Carbon Monoxide */}
        <div style={{
          backgroundColor: '#020617',
          border: '1px solid #1e293b',
          borderRadius: '8px',
          padding: '10px'
        }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>CO Gas</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: coGas > 25 ? '#f43f5e' : '#10b981' }} className="font-mono">
              {coGas.toFixed(1)}
            </span>
            <span style={{ fontSize: '10px', color: '#64748b' }}>PPM</span>
          </div>
          <div style={{ fontSize: '9px', color: coGas > 25 ? '#f43f5e' : '#10b981', marginTop: '2px' }}>
            {coGas > 25 ? '▲ Alert High' : '● Safe Floor'}
          </div>
        </div>

        {/* Acoustic Resonance / Tremor */}
        <div style={{
          backgroundColor: '#020617',
          border: '1px solid #1e293b',
          borderRadius: '8px',
          padding: '10px'
        }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>Tremor Stress</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: tremor > 20 ? '#f59e0b' : '#38bdf8' }} className="font-mono">
              {tremor.toFixed(1)}
            </span>
            <span style={{ fontSize: '10px', color: '#64748b' }}>dB</span>
          </div>
          <div style={{ fontSize: '9px', color: tremor > 20 ? '#f59e0b' : '#38bdf8', marginTop: '2px' }}>
            {tremor > 20 ? '▲ Minor Tremor' : '● Stable Wall'}
          </div>
        </div>

        {/* Smoke Obscuration */}
        <div style={{
          backgroundColor: '#020617',
          border: '1px solid #1e293b',
          borderRadius: '8px',
          padding: '10px'
        }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>Smoke / Dust</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: isDegraded ? '#f43f5e' : '#38bdf8' }} className="font-mono">
              {smoke}%
            </span>
            <span style={{ fontSize: '10px', color: '#64748b' }}>OBS</span>
          </div>
          <div style={{ fontSize: '9px', color: isDegraded ? '#f43f5e' : '#10b981', marginTop: '2px' }}>
            {isDegraded ? '▲ Heavy Plume' : '● Clear Air'}
          </div>
        </div>

        {/* Depth in Tunnel */}
        <div style={{
          backgroundColor: '#020617',
          border: '1px solid #1e293b',
          borderRadius: '8px',
          padding: '10px'
        }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>Tunnel Depth</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#38bdf8' }} className="font-mono">
              {depth.toFixed(1)}
            </span>
            <span style={{ fontSize: '10px', color: '#64748b' }}>m</span>
          </div>
          <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
            Vel: {velocity.toFixed(2)} m/s
          </div>
        </div>

      </div>

      {/* Structural & Ambient Temperature Gauge */}
      <div style={{
        backgroundColor: '#020617',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        padding: '10px',
        fontSize: '11px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ color: '#94a3b8' }}>Subterranean Temp:</span>
          <span style={{ color: '#e2e8f0', fontWeight: 700 }} className="font-mono">
            16.8°C <span style={{ color: '#10b981', fontWeight: 400 }}>(Nominal)</span>
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '5px',
          backgroundColor: '#1e293b',
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <div style={{ width: '42%', height: '100%', backgroundColor: '#06b6d4' }}></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748b', marginTop: '4px' }} className="font-mono">
          <span>0°C</span>
          <span>Hotspot Threshold 38°C</span>
          <span>60°C</span>
        </div>
      </div>

      {/* Milestone / Waypoint Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '6px', textTransform: 'uppercase' }}>
          Mission Milestones
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {milestones.map((m, idx) => (
            <div key={idx} style={{
              backgroundColor: '#020617',
              border: '1px solid #1e293b',
              borderRadius: '6px',
              padding: '8px',
              fontSize: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: m.color || '#38bdf8' }}>
                <span>{m.title}</span>
                <span style={{ color: '#64748b' }} className="font-mono">{m.time}</span>
              </div>
              <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '2px' }}>
                {m.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dual-Use Research Note */}
      <div style={{
        backgroundColor: '#083344',
        border: '1px solid #0e7490',
        borderRadius: '6px',
        padding: '8px',
        fontSize: '10px',
        color: '#e0f2fe'
      }}>
        <span style={{ fontWeight: 700, color: '#38bdf8' }}>Dual-Use Standard:</span> Subterranean tunnel inspection data streaming via point-cloud LAS/OBJ schema.
      </div>
    </aside>
  );
}
