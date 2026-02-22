import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';

function SetupWizard() {
  const navigate = useNavigate();
  const { saveConfig } = useAppStore();
  const [selectedMode, setSelectedMode] = useState<'server' | 'client' | null>(null);
  const [port, setPort] = useState('3000');
  const [isCompleting, setIsCompleting] = useState(false);

  const handleComplete = async () => {
    if (!selectedMode) return;

    setIsCompleting(true);
    await saveConfig({
      mode: selectedMode,
      serverPort: parseInt(port, 10) || 3000,
      allowedOrigins: ['*'],
    });
    setIsCompleting(false);
    navigate('/');
  };

  return (
    <div style={{
      maxWidth: '600px',
      margin: '40px auto',
      padding: '30px',
      backgroundColor: '#16213e',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    }}>
      <h2 style={{ marginBottom: '10px', color: '#e94560' }}>Welcome to MyCluster!</h2>
      <p style={{ color: '#aaa', marginBottom: '30px' }}>
        Let's set up your application. MyCluster can run in two modes:
      </p>

      {/* Mode Selection */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '15px' }}>Select Mode</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <button
            onClick={() => setSelectedMode('server')}
            style={{
              padding: '25px',
              backgroundColor: selectedMode === 'server' ? '#e94560' : '#0f3460',
              border: selectedMode === 'server' ? '2px solid #e94560' : '2px solid transparent',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#eee',
              fontSize: '1rem',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🖥️</div>
            <strong>Server</strong>
            <div style={{ fontSize: '0.85rem', marginTop: '8px', color: '#aaa' }}>
              Expose APIs for remote control
            </div>
          </button>

          <button
            onClick={() => setSelectedMode('client')}
            style={{
              padding: '25px',
              backgroundColor: selectedMode === 'client' ? '#e94560' : '#0f3460',
              border: selectedMode === 'client' ? '2px solid #e94560' : '2px solid transparent',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#eee',
              fontSize: '1rem',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📱</div>
            <strong>Client</strong>
            <div style={{ fontSize: '0.85rem', marginTop: '8px', color: '#aaa' }}>
              Control remote APIs
            </div>
          </button>
        </div>
      </div>

      {/* Server Configuration (only if server mode selected) */}
      {selectedMode === 'server' && (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '15px' }}>Server Configuration</h3>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#aaa' }}>
              Server Port
            </label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#0f3460',
                border: '1px solid #1a1a2e',
                borderRadius: '6px',
                color: '#eee',
                fontSize: '1rem',
              }}
            />
          </div>
        </div>
      )}

      {/* Complete Button */}
      <button
        onClick={handleComplete}
        disabled={!selectedMode || isCompleting}
        style={{
          width: '100%',
          padding: '15px',
          backgroundColor: selectedMode ? '#e94560' : '#0f3460',
          border: 'none',
          borderRadius: '8px',
          color: '#eee',
          fontSize: '1.1rem',
          cursor: selectedMode ? 'pointer' : 'not-allowed',
          opacity: selectedMode ? 1 : 0.5,
        }}
      >
        {isCompleting ? 'Setting up...' : 'Complete Setup'}
      </button>
    </div>
  );
}

export default SetupWizard;
