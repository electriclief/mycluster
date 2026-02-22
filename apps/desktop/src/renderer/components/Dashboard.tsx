import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import ServerDashboard from './ServerDashboard';
import LanComputers from './LanComputers';

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

  // Show server dashboard if in server mode
  if (mode === 'server') {
    return <ServerDashboard />;
  }

  return (
    <div>
      <h2 style={{ marginBottom: '20px', color: '#e94560' }}>Dashboard</h2>

      {/* Quick Info Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '20px',
      }}>
        <div style={{
          padding: '15px',
          backgroundColor: '#16213e',
          borderRadius: '8px',
          border: '1px solid #0f3460',
        }}>
          <h3 style={{ marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Mode</h3>
          <p style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#e94560' }}>
            {mode ? mode.charAt(0).toUpperCase() + mode.slice(1) : 'Not Set'}
          </p>
        </div>

        <div style={{
          padding: '15px',
          backgroundColor: '#16213e',
          borderRadius: '8px',
          border: '1px solid #0f3460',
        }}>
          <h3 style={{ marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Platform</h3>
          <p style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>
            {platform === 'win32' ? '🪟 Windows' : platform === 'darwin' ? '🍎 macOS' : '🐧 Linux'}
          </p>
        </div>

        <div style={{
          padding: '15px',
          backgroundColor: '#16213e',
          borderRadius: '8px',
          border: '1px solid #0f3460',
        }}>
          <h3 style={{ marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Version</h3>
          <p style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>v{version || '0.1.0'}</p>
        </div>
      </div>

      {/* LAN Computers Section - Main Dashboard Content */}
      <LanComputers />
    </div>
  );
}

export default Dashboard;
