import { useState, useEffect } from 'react';
import { useAppStore } from '../store';

interface ServerStats {
  isRunning: boolean;
  port: number;
  requestCount: number;
  startTime: string | null;
  endpoints: string[];
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: unknown;
}

function ServerDashboard() {
  const { config } = useAppStore();
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    const s = await window.electronAPI.invoke('server:getStats');
    setStats(s);
  };

  const loadLogs = async () => {
    const l = await window.electronAPI.invoke('server:getLogs');
    setLogs(l);
  };

  useEffect(() => {
    loadStats();
    loadLogs();

    // Poll for updates when server is running
    const interval = setInterval(() => {
      loadStats();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    setIsStarting(true);
    setError(null);
    const result = await window.electronAPI.invoke('server:start');
    if (result.success) {
      await loadStats();
    } else {
      setError(result.error || 'Failed to start server');
    }
    setIsStarting(false);
  };

  const handleStop = async () => {
    setIsStopping(true);
    await window.electronAPI.invoke('server:stop');
    await loadStats();
    setIsStopping(false);
  };

  const handleClearLogs = async () => {
    await window.electronAPI.invoke('server:clearLogs');
    await loadLogs();
  };

  const getUptime = () => {
    if (!stats?.startTime || !stats.isRunning) return 'Not running';
    const start = new Date(stats.startTime);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const getLogLevelColor = (level: string) => {
    return {
      info: '#00bcd4',
      warn: '#ff9800',
      error: '#f44336',
      debug: '#9e9e9e',
    }[level] || '#eee';
  };

  return (
    <div>
      <h2 style={{ marginBottom: '20px', color: '#e94560' }}>Server Dashboard</h2>

      {/* Status Card */}
      <div
        style={{
          padding: '20px',
          backgroundColor: stats?.isRunning ? '#1b5e20' : '#b71c1c',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '1.5rem' }}>
            {stats?.isRunning ? '🟢 Server Running' : '🔴 Server Stopped'}
          </h3>
          <p style={{ margin: '5px 0 0', opacity: 0.8 }}>
            Port: {config?.serverPort || 3000} | Uptime: {getUptime()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {!stats?.isRunning ? (
            <button
              onClick={handleStart}
              disabled={isStarting}
              style={{
                padding: '12px 24px',
                backgroundColor: '#4caf50',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '1rem',
                cursor: isStarting ? 'not-allowed' : 'pointer',
                opacity: isStarting ? 0.7 : 1,
              }}
            >
              {isStarting ? 'Starting...' : 'Start Server'}
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={isStopping}
              style={{
                padding: '12px 24px',
                backgroundColor: '#f44336',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '1rem',
                cursor: isStopping ? 'not-allowed' : 'pointer',
                opacity: isStopping ? 0.7 : 1,
              }}
            >
              {isStopping ? 'Stopping...' : 'Stop Server'}
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            padding: '15px',
            backgroundColor: '#b71c1c',
            borderRadius: '6px',
            marginBottom: '20px',
            color: '#fff',
          }}
        >
          ❌ {error}
        </div>
      )}

      {/* Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            padding: '20px',
            backgroundColor: '#16213e',
            borderRadius: '8px',
            border: '1px solid #0f3460',
          }}
        >
          <h4 style={{ color: '#aaa', margin: '0 0 10px' }}>Requests</h4>
          <p style={{ fontSize: '2rem', margin: 0, color: '#e94560' }}>
            {stats?.requestCount || 0}
          </p>
        </div>

        <div
          style={{
            padding: '20px',
            backgroundColor: '#16213e',
            borderRadius: '8px',
            border: '1px solid #0f3460',
          }}
        >
          <h4 style={{ color: '#aaa', margin: '0 0 10px' }}>Endpoints</h4>
          <p style={{ fontSize: '2rem', margin: 0, color: '#4caf50' }}>
            {stats?.endpoints?.length || 0}
          </p>
        </div>

        <div
          style={{
            padding: '20px',
            backgroundColor: '#16213e',
            borderRadius: '8px',
            border: '1px solid #0f3460',
          }}
        >
          <h4 style={{ color: '#aaa', margin: '0 0 10px' }}>Port</h4>
          <p style={{ fontSize: '2rem', margin: 0, color: '#2196f3' }}>
            {config?.serverPort || 3000}
          </p>
        </div>
      </div>

      {/* Server Info */}
      <div
        style={{
          padding: '20px',
          backgroundColor: '#16213e',
          borderRadius: '8px',
          border: '1px solid #0f3460',
          marginBottom: '20px',
        }}
      >
        <h3 style={{ color: '#aaa', marginTop: 0 }}>Server Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <p style={{ color: '#888', margin: '0 0 5px' }}>Instance ID</p>
            <p style={{ fontFamily: 'monospace', fontSize: '0.9rem', margin: 0 }}>
              {config?.instanceId || 'N/A'}
            </p>
          </div>
          <div>
            <p style={{ color: '#888', margin: '0 0 5px' }}>Allowed Origins</p>
            <p style={{ margin: 0 }}>{config?.allowedOrigins?.join(', ') || '*'}</p>
          </div>
        </div>
      </div>

      {/* Request Logs */}
      <div
        style={{
          padding: '20px',
          backgroundColor: '#16213e',
          borderRadius: '8px',
          border: '1px solid #0f3460',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ color: '#aaa', margin: 0 }}>Request Logs</h3>
          <button
            onClick={handleClearLogs}
            style={{
              padding: '8px 16px',
              backgroundColor: '#0f3460',
              border: 'none',
              borderRadius: '6px',
              color: '#eee',
              cursor: 'pointer',
            }}
          >
            Clear Logs
          </button>
        </div>

        <div
          style={{
            backgroundColor: '#0f3460',
            borderRadius: '6px',
            padding: '15px',
            maxHeight: '400px',
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '0.85rem',
          }}
        >
          {logs.length === 0 ? (
            <p style={{ color: '#888', margin: 0 }}>No logs yet</p>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                style={{
                  marginBottom: '10px',
                  paddingBottom: '10px',
                  borderBottom: index < logs.length - 1 ? '1px solid #1a1a2e' : 'none',
                }}
              >
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '5px' }}>
                  <span
                    style={{
                      color: getLogLevelColor(log.level),
                      fontWeight: 'bold',
                      minWidth: '50px',
                    }}
                  >
                    [{log.level.toUpperCase()}]
                  </span>
                  <span style={{ color: '#888' }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{ color: '#eee' }}>{log.message}</div>
                {log.data && (
                  <pre
                    style={{
                      backgroundColor: '#1a1a2e',
                      padding: '8px',
                      borderRadius: '4px',
                      marginTop: '5px',
                      overflow: 'auto',
                      color: '#aaa',
                    }}
                  >
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default ServerDashboard;
