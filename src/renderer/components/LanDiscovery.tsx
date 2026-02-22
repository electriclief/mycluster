import { useState, useEffect } from 'react';

interface LanComputer {
  id: string;
  ipAddress: string;
  computerName: string;
  isOnline: boolean;
  lastSeen: string;
  addedDate: string;
}

interface ScanResult {
  ip: string;
  isOnline: boolean;
}

function LanDiscovery() {
  const [computers, setComputers] = useState<LanComputer[]>([]);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [selectedIp, setSelectedIp] = useState<string | null>(null);
  const [computerName, setComputerName] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadComputers = async () => {
    const list = await window.electronAPI.invoke('lan:getComputers');
    setComputers(list as LanComputer[]);
  };

  useEffect(() => {
    loadComputers();
  }, []);

  const handleScan = async () => {
    setIsScanning(true);
    setScanResults([]);
    setScanProgress(0);
    setSelectedIp(null);
    setMessage(null);

    try {
      const results = await window.electronAPI.invoke('lan:scan', {
        baseIp: '192.168.1.100',
        start: 100,
        end: 160,
      });
      setScanResults(results);
      const onlineCount = results.filter(r => r.isOnline).length;
      setMessage({
        type: 'success',
        text: `Scan complete! Found ${onlineCount} online devices out of ${results.length} scanned.`,
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Scan failed: ${(error as Error).message}`,
      });
    } finally {
      setIsScanning(false);
      setScanProgress(100);
    }
  };

  const handleSelectIp = (ip: string) => {
    setSelectedIp(ip);
    setComputerName('');
    setShowAddDialog(true);
  };

  const handleAddComputer = async () => {
    if (!selectedIp || !computerName.trim()) return;

    try {
      await window.electronAPI.invoke('lan:addComputer', {
        ipAddress: selectedIp,
        computerName: computerName.trim(),
        isOnline: true,
        lastSeen: new Date().toISOString(),
      });

      setMessage({
        type: 'success',
        text: `Added "${computerName.trim()}" (${selectedIp}) to your LAN computers.`,
      });
      setShowAddDialog(false);
      setSelectedIp(null);
      setComputerName('');
      await loadComputers();
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Failed to add computer: ${(error as Error).message}`,
      });
    }
  };

  const handleRemoveComputer = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from your LAN computers?`)) return;

    try {
      await window.electronAPI.invoke('lan:removeComputer', id);
      setMessage({
        type: 'success',
        text: `Removed "${name}" from your LAN computers.`,
      });
      await loadComputers();
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Failed to remove computer: ${(error as Error).message}`,
      });
    }
  };

  const handleRefreshStatus = async (id: string, ip: string) => {
    const isOnline = await window.electronAPI.invoke('lan:ping', ip);
    
    await window.electronAPI.invoke('lan:updateComputer', id, {
      isOnline,
      lastSeen: new Date().toISOString(),
    });

    await loadComputers();
  };

  const getOnlineCount = () => {
    return computers.filter(c => c.isOnline).length;
  };

  return (
    <div>
      <h2 style={{ marginBottom: '20px', color: '#e94560' }}>LAN Computers</h2>

      {/* Messages */}
      {message && (
        <div
          style={{
            padding: '12px',
            marginBottom: '20px',
            borderRadius: '6px',
            backgroundColor: message.type === 'success' ? '#00c853' : '#ff5252',
            color: '#fff',
          }}
        >
          {message.text}
        </div>
      )}

      {/* Scan Section */}
      <div
        style={{
          padding: '20px',
          backgroundColor: '#16213e',
          borderRadius: '8px',
          border: '1px solid #0f3460',
          marginBottom: '20px',
        }}
      >
        <h3 style={{ color: '#aaa', marginTop: 0 }}>Discover Computers on LAN</h3>
        <p style={{ color: '#888', marginBottom: '15px' }}>
          Scans IP range 192.168.1.100 - 192.168.1.160 for active devices
        </p>

        <button
          onClick={handleScan}
          disabled={isScanning}
          style={{
            padding: '12px 24px',
            backgroundColor: isScanning ? '#0f3460' : '#e94560',
            border: 'none',
            borderRadius: '6px',
            color: '#eee',
            fontSize: '1rem',
            cursor: isScanning ? 'not-allowed' : 'pointer',
            opacity: isScanning ? 0.7 : 1,
          }}
        >
          {isScanning ? 'Scanning...' : '🔍 Scan LAN'}
        </button>

        {isScanning && (
          <div style={{ marginTop: '15px' }}>
            <div style={{ backgroundColor: '#0f3460', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
              <div
                style={{
                  backgroundColor: '#e94560',
                  height: '100%',
                  width: `${scanProgress}%`,
                  transition: 'width 0.3s',
                }}
              />
            </div>
            <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '8px' }}>
              Scanning IP range... This may take a minute.
            </p>
          </div>
        )}

        {/* Scan Results */}
        {scanResults.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ color: '#aaa', marginBottom: '10px' }}>Scan Results</h4>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '10px',
              }}
            >
              {scanResults.map((result) => (
                <button
                  key={result.ip}
                  onClick={() => result.isOnline && handleSelectIp(result.ip)}
                  disabled={!result.isOnline}
                  style={{
                    padding: '12px',
                    backgroundColor: result.isOnline ? '#1b5e20' : '#2a2a3a',
                    border: result.ip === selectedIp ? '2px solid #e94560' : '2px solid transparent',
                    borderRadius: '6px',
                    color: result.isOnline ? '#fff' : '#666',
                    cursor: result.isOnline ? 'pointer' : 'not-allowed',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                  }}
                >
                  <div>{result.ip}</div>
                  <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                    {result.isOnline ? '🟢 Online' : '⚪ Offline'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Saved Computers List */}
      <div
        style={{
          padding: '20px',
          backgroundColor: '#16213e',
          borderRadius: '8px',
          border: '1px solid #0f3460',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ color: '#aaa', margin: 0 }}>
            My LAN Computers ({getOnlineCount()}/{computers.length} online)
          </h3>
          <button
            onClick={loadComputers}
            style={{
              padding: '8px 16px',
              backgroundColor: '#0f3460',
              border: 'none',
              borderRadius: '6px',
              color: '#eee',
              cursor: 'pointer',
            }}
          >
            🔄 Refresh
          </button>
        </div>

        {computers.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '40px' }}>
            No computers saved yet. Scan your LAN to discover devices.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {computers.map((computer) => (
              <div
                key={computer.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '15px',
                  backgroundColor: '#0f3460',
                  borderRadius: '6px',
                  border: computer.isOnline ? '1px solid #4caf50' : '1px solid #666',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: computer.isOnline ? '#4caf50' : '#666',
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {computer.computerName}
                    </div>
                    <div style={{ fontFamily: 'monospace', color: '#888', fontSize: '0.9rem' }}>
                      {computer.ipAddress}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ color: '#888', fontSize: '0.85rem' }}>
                    {computer.isOnline ? 'Online' : 'Offline'}
                  </span>
                  <button
                    onClick={() => handleRefreshStatus(computer.id, computer.ipAddress)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#1a1a2e',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#eee',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    Check
                  </button>
                  <button
                    onClick={() => handleRemoveComputer(computer.id, computer.computerName)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#b71c1c',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Computer Dialog */}
      {showAddDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#16213e',
              padding: '30px',
              borderRadius: '12px',
              maxWidth: '400px',
              width: '100%',
            }}
          >
            <h3 style={{ color: '#e94560', marginTop: 0 }}>Add Computer</h3>
            <p style={{ color: '#888', marginBottom: '20px' }}>
              Adding computer at <strong style={{ color: '#eee', fontFamily: 'monospace' }}>{selectedIp}</strong>
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#aaa' }}>
                Computer Name
              </label>
              <input
                type="text"
                value={computerName}
                onChange={(e) => setComputerName(e.target.value)}
                placeholder="e.g., Living Room PC, Office Server..."
                autoFocus
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

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleAddComputer}
                disabled={!computerName.trim()}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: computerName.trim() ? '#e94560' : '#0f3460',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#eee',
                  cursor: computerName.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '1rem',
                }}
              >
                Add Computer
              </button>
              <button
                onClick={() => {
                  setShowAddDialog(false);
                  setSelectedIp(null);
                  setComputerName('');
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#0f3460',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#eee',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LanDiscovery;
