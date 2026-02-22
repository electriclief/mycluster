import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppStore } from '../store';

function Layout() {
  const navigate = useNavigate();
  const { loadConfig, isFirstLaunch } = useAppStore();

  useEffect(() => {
    loadConfig();
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      backgroundColor: '#1a1a2e',
      color: '#eee'
    }}>
      {/* Header */}
      <header style={{
        padding: '15px 20px',
        backgroundColor: '#16213e',
        borderBottom: '1px solid #0f3460',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#e94560' }}>MyCluster</h1>
        <nav style={{ display: 'flex', gap: '15px' }}>
          <a
            href="/"
            onClick={(e) => { e.preventDefault(); navigate('/'); }}
            style={{ color: '#eee', textDecoration: 'none', cursor: 'pointer' }}
          >
            Dashboard
          </a>
          <a
            href="/jobs"
            onClick={(e) => { e.preventDefault(); navigate('/jobs'); }}
            style={{ color: '#eee', textDecoration: 'none', cursor: 'pointer' }}
          >
            Jobs
          </a>
          <a
            href="/results"
            onClick={(e) => { e.preventDefault(); navigate('/results'); }}
            style={{ color: '#eee', textDecoration: 'none', cursor: 'pointer' }}
          >
            Results
          </a>
          <a
            href="/settings"
            onClick={(e) => { e.preventDefault(); navigate('/settings'); }}
            style={{ color: '#eee', textDecoration: 'none', cursor: 'pointer' }}
          >
            Settings
          </a>
        </nav>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer style={{
        padding: '10px 20px',
        backgroundColor: '#16213e',
        borderTop: '1px solid #0f3460',
        fontSize: '0.85rem',
        color: '#888',
      }}>
        MyCluster v0.1.0
      </footer>
    </div>
  );
}

export default Layout;
