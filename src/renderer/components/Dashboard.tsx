import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';

function Dashboard() {
  const navigate = useNavigate();
  const { version, platform, mode, config, loadConfig, isFirstLaunch } = useAppStore();

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (isFirstLaunch === true) {
      navigate('/setup');
    }
  }, [isFirstLaunch]);

  if (isFirstLaunch === true) {
    return null;
  }

  return (
    <div>
      <h2 style={{ marginBottom: '20px', color: '#e94560' }}>Dashboard</h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '30px',
      }}>
        {/* Mode Card */}
        <div style={{
          padding: '20px',
          backgroundColor: '#16213e',
          borderRadius: '8px',
          border: '1px solid #0f3460',
        }}>
          <h3 style={{ marginBottom: '10px', color: '#aaa' }}>Current Mode</h3>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>
            {mode === 'server' ? '🖥️' : mode === 'client' ? '📱' : '❓'}
          </div>
          <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
            {mode ? mode.charAt(0).toUpperCase() + mode.slice(1) : 'Not Configured'}
          </p>
          {mode === 'server' && (
            <p style={{ color: '#aaa', marginTop: '5px' }}>
              Port: {config?.serverPort || 3000}
            </p>
          )}
        </div>

        {/* Platform Card */}
        <div style={{
          padding: '20px',
          backgroundColor: '#16213e',
          borderRadius: '8px',
          border: '1px solid #0f3460',
        }}>
          <h3 style={{ marginBottom: '10px', color: '#aaa' }}>Platform</h3>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>
            {platform === 'win32' ? '🪟' : platform === 'darwin' ? '🍎' : '🐧'}
          </div>
          <p style={{ fontSize: '1.2rem', fontWeight: 'bold', textTransform: 'capitalize' }}>
            {platform || 'Unknown'}
          </p>
        </div>

        {/* Version Card */}
        <div style={{
          padding: '20px',
          backgroundColor: '#16213e',
          borderRadius: '8px',
          border: '1px solid #0f3460',
        }}>
          <h3 style={{ marginBottom: '10px', color: '#aaa' }}>Version</h3>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📦</div>
          <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
            v{version || '0.1.0'}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{
        padding: '20px',
        backgroundColor: '#16213e',
        borderRadius: '8px',
        border: '1px solid #0f3460',
      }}>
        <h3 style={{ marginBottom: '15px', color: '#aaa' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/setup')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#e94560',
              border: 'none',
              borderRadius: '6px',
              color: '#eee',
              cursor: 'pointer',
            }}
          >
            Change Mode
          </button>
          <button
            onClick={() => alert('Settings coming soon!')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0f3460',
              border: 'none',
              borderRadius: '6px',
              color: '#eee',
              cursor: 'pointer',
            }}
          >
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
