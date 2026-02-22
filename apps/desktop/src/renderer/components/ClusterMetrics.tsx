import { useState, useEffect } from 'react';

interface ClusterStats {
  isRunning: boolean;
  port: number;
  uptime: number;
  requestCount: number;
  wsConnections: number;
  agents: {
    total: number;
    online: number;
  };
  jobs: {
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
  computers: {
    total: number;
    online: number;
  };
}

interface ClusterMetricsProps {
  serverUrl?: string;
}

function ClusterMetrics({ serverUrl }: ClusterMetricsProps) {
  const [stats, setStats] = useState<ClusterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      const response = await fetch(serverUrl || '/api/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        setError(null);
      } else {
        setError('Failed to load stats');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    
    // Refresh every 10 seconds
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, [serverUrl]);

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
        Loading cluster metrics...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#ff5252' }}>
        ⚠️ {error}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div>
      <h2 style={{ marginBottom: '20px', color: '#e94560' }}>Cluster Metrics</h2>
      
      {/* Server Status */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '20px',
      }}>
        <div style={{ padding: '20px', backgroundColor: '#16213e', borderRadius: '8px', border: stats.isRunning ? '1px solid #4caf50' : '1px solid #f44336' }}>
          <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '8px' }}>Server Status</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: stats.isRunning ? '#4caf50' : '#f44336' }}>
            {stats.isRunning ? '🟢 Online' : '🔴 Offline'}
          </div>
          <div style={{ color: '#666', fontSize: '0.85rem', marginTop: '5px' }}>
            Port {stats.port} • Uptime: {formatUptime(stats.uptime)}
          </div>
        </div>

        <div style={{ padding: '20px', backgroundColor: '#16213e', borderRadius: '8px', border: '1px solid #0f3460' }}>
          <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '8px' }}>WebSocket</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2196f3' }}>
            🔌 {stats.wsConnections}
          </div>
          <div style={{ color: '#666', fontSize: '0.85rem', marginTop: '5px' }}>
            Active connections
          </div>
        </div>

        <div style={{ padding: '20px', backgroundColor: '#16213e', borderRadius: '8px', border: '1px solid #0f3460' }}>
          <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '8px' }}>Requests</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff9800' }}>
            📊 {stats.requestCount.toLocaleString()}
          </div>
          <div style={{ color: '#666', fontSize: '0.85rem', marginTop: '5px' }}>
            Total requests
          </div>
        </div>
      </div>

      {/* Agents */}
      <div style={{
        padding: '20px',
        backgroundColor: '#16213e',
        borderRadius: '8px',
        border: '1px solid #0f3460',
        marginBottom: '20px',
      }}>
        <h3 style={{ color: '#aaa', marginTop: 0, marginBottom: '15px' }}>Agents</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4caf50' }}>
              {stats.agents.online}
            </div>
            <div style={{ color: '#888', fontSize: '0.85rem' }}>🟢 Online</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f44336' }}>
              {stats.agents.total - stats.agents.online}
            </div>
            <div style={{ color: '#888', fontSize: '0.85rem' }}>🔴 Offline</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#eee' }}>
              {stats.agents.total}
            </div>
            <div style={{ color: '#888', fontSize: '0.85rem' }}>Total</div>
          </div>
        </div>
      </div>

      {/* Jobs */}
      <div style={{
        padding: '20px',
        backgroundColor: '#16213e',
        borderRadius: '8px',
        border: '1px solid #0f3460',
        marginBottom: '20px',
      }}>
        <h3 style={{ color: '#aaa', marginTop: 0, marginBottom: '15px' }}>Job Queue</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '15px' }}>
          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#0f3460', borderRadius: '6px' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#ff9800' }}>
              {stats.jobs.pending}
            </div>
            <div style={{ color: '#888', fontSize: '0.85rem' }}>Pending</div>
          </div>
          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#0f3460', borderRadius: '6px' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#2196f3' }}>
              {stats.jobs.running}
            </div>
            <div style={{ color: '#888', fontSize: '0.85rem' }}>Running</div>
          </div>
          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#0f3460', borderRadius: '6px' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#4caf50' }}>
              {stats.jobs.completed}
            </div>
            <div style={{ color: '#888', fontSize: '0.85rem' }}>Complete</div>
          </div>
          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#0f3460', borderRadius: '6px' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f44336' }}>
              {stats.jobs.failed}
            </div>
            <div style={{ color: '#888', fontSize: '0.85rem' }}>Failed</div>
          </div>
        </div>
      </div>

      {/* Computers */}
      <div style={{
        padding: '20px',
        backgroundColor: '#16213e',
        borderRadius: '8px',
        border: '1px solid #0f3460',
      }}>
        <h3 style={{ color: '#aaa', marginTop: 0, marginBottom: '15px' }}>Computers</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4caf50' }}>
              {stats.computers.online}
            </div>
            <div style={{ color: '#888', fontSize: '0.85rem' }}>🟢 Online</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#eee' }}>
              {stats.computers.total}
            </div>
            <div style={{ color: '#888', fontSize: '0.85rem' }}>Total</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClusterMetrics;
