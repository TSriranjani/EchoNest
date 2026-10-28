import React from 'react';

export default function Header({
  missionProfile,
  setMissionProfile,
  navState,
  trustScore,
  onEmergencyRTH
}) {
  return (
    <header style={{
      backgroundColor: '#090d16',
      borderBottom: '1px solid #1e293b',
      padding: '10px 18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 50
    }}>
      {/* Brand & Mission Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid rgba(6, 182, 212, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#22d3ee',
            fontWeight: 800,
            fontSize: '18px',
            boxShadow: '0 0 12px rgba(6, 182, 212, 0.25)'
          }}>
            ⚡
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 800, letterSpacing: '0.08em', fontSize: '15px', color: '#ffffff' }}>
                ECHONEST GCS
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: '#083344',
                color: '#38bdf8',
                border: '1px solid #0e7490'
              }}>
                TACTICAL v2.5
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Uncertainty-Aware Subterranean Autonomy
            </div>
          </div>
        </div>

        <div style={{ width: '1px', height: '24px', backgroundColor: '#1e293b' }}></div>

        {/* Profile Selector */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#020617',
          padding: '4px 10px',
          borderRadius: '6px',
          border: '1px solid #1e293b',
          fontSize: '11px'
        }}>
          <span style={{ color: '#64748b', fontWeight: 600 }}>PROFILE:</span>
          <select
            value={missionProfile}
            onChange={(e) => setMissionProfile(e.target.value)}
            style={{
              backgroundColor: 'transparent',
              color: '#38bdf8',
              border: 'none',
              outline: 'none',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <option value="tunnel" style={{ background: '#090d16' }}>Underground Tunnel Mapping</option>
            <option value="bunker" style={{ background: '#090d16' }}>Military Bunker Reconnaissance</option>
            <option value="sar" style={{ background: '#090d16' }}>Search & Rescue (Collapsed Void)</option>
            <option value="hazmat" style={{ background: '#090d16' }}>Hazardous & CBRN Assessment</option>
          </select>
        </div>
      </div>

      {/* Middle Status Indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '11px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: trustScore < 40 ? '#f43f5e' : '#10b981',
            boxShadow: trustScore < 40 ? '0 0 8px #f43f5e' : '0 0 8px #10b981'
          }}></span>
          <div>
            <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 700 }}>NAVIGATION</div>
            <div style={{ fontWeight: 700, color: trustScore < 40 ? '#f43f5e' : '#10b981' }}>
              {navState}
            </div>
          </div>
        </div>

        <div style={{ width: '1px', height: '20px', backgroundColor: '#1e293b' }}></div>

        <div>
          <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 700 }}>MESH RELAY</div>
          <div style={{ fontWeight: 700, color: '#38bdf8' }} className="font-mono">
            CH-04 • 14ms LATENCY
          </div>
        </div>

        <div style={{ width: '1px', height: '20px', backgroundColor: '#1e293b' }}></div>

        <div>
          <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 700 }}>LOCALIZATION</div>
          <div style={{ fontWeight: 700, color: '#f59e0b' }} className="font-mono">
            GPS-DENIED / SLAM
          </div>
        </div>
      </div>

      {/* Right: Return-Trip Battery & Abort Trigger */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', fontSize: '11px' }}>
            <span style={{ color: '#94a3b8' }}>Reserve Buffer:</span>
            <span style={{ fontWeight: 700, color: '#10b981' }}>+8m 15s Safe</span>
          </div>
          <div style={{
            width: '130px',
            height: '7px',
            backgroundColor: '#1e293b',
            borderRadius: '4px',
            display: 'flex',
            overflow: 'hidden',
            marginTop: '4px'
          }}>
            <div style={{ width: '35%', backgroundColor: '#0284c7' }} title="Expended (35%)"></div>
            <div style={{ width: '35%', backgroundColor: '#10b981' }} title="Safe Exploration (35%)"></div>
            <div style={{ width: '30%', backgroundColor: '#f59e0b' }} title="Return-Trip Reserve (30%)"></div>
          </div>
          <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }} className="font-mono">
            BAT 65% | RET-RES 30%
          </div>
        </div>

        <button
          onClick={onEmergencyRTH}
          style={{
            backgroundColor: '#be123c',
            color: '#ffffff',
            border: '1px solid #f43f5e',
            borderRadius: '6px',
            padding: '8px 14px',
            fontSize: '11px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 0 14px rgba(244, 63, 94, 0.35)',
            transition: 'all 0.15s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e11d48'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#be123c'}
        >
          <span>↺</span>
          <span>SAFE RETURN (RTH)</span>
        </button>
      </div>
    </header>
  );
}
