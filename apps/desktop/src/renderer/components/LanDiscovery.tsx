import { useState, useEffect } from 'react';

interface LanService {
  id: string;
  type: 'ollama' | 'custom';
  name: string;
  enabled: boolean;
  port?: number;
  baseUrl?: string;
  config?: Record<string, unknown>;
  addedDate: string;
  lastChecked?: string;
  status?: 'online' | 'offline' | 'error';
  models?: string[];
}

interface LanComputer {
  id: string;
  ipAddress: string;
  computerName: string;
  isOnline: boolean;
  lastSeen: string;
  addedDate: string;
  services?: LanService[];
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
  const [currentIp, setCurrentIp] = useState('');
  const [selectedIp, setSelectedIp] = useState<string | null>(null);
  const [computerName, setComputerName] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedComputer, setSelectedComputer] = useState<LanComputer | null>(null);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState('http://192.168.1.100:11434');
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [checkingOllama, setCheckingOllama] = useState(false);
  const [shouldStopScan, setShouldStopScan] = useState(false);

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
    setCurrentIp('');
    setSelectedIp(null);
    setMessage(null);
    setShouldStopScan(false);

    try {
      const total = 61; // 100 to 160
      let completed = 0;
      
      // Scan with progress updates
      for (let i = 100; i <= 160; i++) {
        if (shouldStopScan) {
          break;
        }
        
        const ip = `192.168.1.${i}`;
        setCurrentIp(ip);
        
        const isOnline = await window.electronAPI.invoke('lan:ping', ip);
        setScanResults(prev => [...prev, { ip, isOnline }]);
        
        completed++;
        setScanProgress(Math.round((completed / total) * 100));
      }
      
      if (!shouldStopScan) {
        setCurrentIp('');
        const finalOnlineCount = scanResults.filter(r => r.isOnline).length;
        setMessage({
          type: 'success',
          text: `Scan complete! Found ${finalOnlineCount} online devices out of ${scanResults.length} scanned.`,
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Scan failed: ${(error as Error).message}`,
      });
    } finally {
      setIsScanning(false);
      setScanProgress(100);
      setCurrentIp('');
      setShouldStopScan(false);
    }
  };

  const handleStopScan = () => {
    setShouldStopScan(true);
    setIsScanning(false);
    setCurrentIp('');
    setMessage({
      type: 'success',
      text: `Scan stopped. Found ${scanResults.filter(r => r.isOnline).length} online devices.`,
    });
  };

  const handleSelectIp = (ip: string) => {
    if (isScanning) {
      handleStopScan();
    }
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

  const handleAddService = (computer: LanComputer, serviceType: 'ollama' | 'custom') => {
    setSelectedComputer(computer);
    if (serviceType === 'ollama') {
      setOllamaBaseUrl(`http://${computer.ipAddress}:11434`);
    }
    setShowServiceDialog(true);
  };

  const handleCheckOllama = async () => {
    setCheckingOllama(true);
    try {
      const result = await window.electronAPI.invoke('lan:checkOllama', ollamaBaseUrl);
      if (result.available) {
        setOllamaModels(result.models || []);
        setMessage({
          type: 'success',
          text: `Ollama found! ${result.models?.length || 0} models available.`,
        });
      } else {
        setMessage({
          type: 'error',
          text: `Ollama not available: ${result.error}`,
        });
        setOllamaModels([]);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Failed to check Ollama: ${(error as Error).message}`,
      });
    } finally {
      setCheckingOllama(false);
    }
  };

  const handleSaveOllamaService = async () => {
    if (!selectedComputer) return;

    try {
      await window.electronAPI.invoke('lan:addService', selectedComputer.id, {
        type: 'ollama',
        name: 'Ollama API',
        enabled: true,
        baseUrl: ollamaBaseUrl,
        port: 11434,
        config: { models: ollamaModels },
      });

      setMessage({
        type: 'success',
        text: `Added Ollama service to "${selectedComputer.computerName}".`,
      });
      setShowServiceDialog(false);
      setSelectedComputer(null);
      setOllamaModels([]);
      await loadComputers();
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Failed to add service: ${(error as Error).message}`,
      });
    }
  };

  const handleRemoveService = async (computerId: string, serviceId: string, serviceName: string) => {
    if (!confirm(`Remove "${serviceName}" service?`)) return;

    try {
      await window.electronAPI.invoke('lan:removeService', computerId, serviceId);
      setMessage({
        type: 'success',
        text: `Removed "${serviceName}" service.`,
      });
      await loadComputers();
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Failed to remove service: ${(error as Error).message}`,
      });
    }
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

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
            <button
              onClick={handleStopScan}
              style={{
                padding: '12px 24px',
                backgroundColor: '#0f3460',
                border: '1px solid #ff9800',
                borderRadius: '6px',
                color: '#ff9800',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              ⏹️ Stop
            </button>
          )}
        </div>

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <p style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>
                {currentIp ? (
                  <>
                    Pinging <span style={{ color: '#e94560', fontFamily: 'monospace', fontWeight: 'bold' }}>{currentIp}</span>...
                  </>
                ) : (
                  'Scanning IP range...'
                )}
              </p>
              <p style={{ color: '#aaa', fontSize: '0.85rem', margin: 0 }}>
                {scanProgress}% ({scanResults.length} checked)
              </p>
            </div>
          </div>
        )}

        {/* Scan Results */}
        {scanResults.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ color: '#aaa', margin: 0 }}>
                Scan Results
                {isScanning && (
                  <span style={{ 
                    marginLeft: '10px', 
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    backgroundColor: '#e94560',
                    borderRadius: '4px',
                    color: '#fff',
                    animation: 'pulse 1s infinite',
                  }}>
                    LIVE
                  </span>
                )}
              </h4>
              <span style={{ color: '#888', fontSize: '0.85rem' }}>
                🟢 {scanResults.filter(r => r.isOnline).length} online / {scanResults.length} total
              </span>
            </div>
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
                  flexDirection: 'column',
                  padding: '15px',
                  backgroundColor: '#0f3460',
                  borderRadius: '6px',
                  border: computer.isOnline ? '1px solid #4caf50' : '1px solid #666',
                }}
              >
                {/* Computer Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
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
                      {computer.isOnline ? '🟢 Online' : '⚪ Offline'}
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
                      🔄 Check
                    </button>
                    <button
                      onClick={() => handleAddService(computer, 'ollama')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#0f3460',
                        border: '1px solid #e94560',
                        borderRadius: '4px',
                        color: '#e94560',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                      }}
                    >
                      ➕ Add Service
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
                      🗑️ Remove
                    </button>
                  </div>
                </div>

                {/* Services List */}
                {computer.services && computer.services.length > 0 && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #1a1a2e' }}>
                    <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '8px' }}>Services:</div>
                    {computer.services.map((service) => (
                      <div
                        key={service.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          backgroundColor: '#16213e',
                          borderRadius: '4px',
                          marginBottom: '6px',
                          border: service.status === 'online' ? '1px solid #4caf50' : '1px solid transparent',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.2rem' }}>{service.type === 'ollama' ? '🦙' : '🔌'}</span>
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#eee', fontSize: '0.95rem' }}>
                              {service.name}
                            </div>
                            <div style={{ color: '#888', fontSize: '0.8rem' }}>
                              {service.baseUrl || `Port ${service.port}`}
                              {service.models && service.models.length > 0 && (
                                <span style={{ marginLeft: '10px', color: '#aaa' }}>
                                  • {service.models.length} models
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            padding: '2px 8px', 
                            borderRadius: '4px',
                            backgroundColor: service.enabled ? '#1b5e20' : '#424242',
                            color: '#fff',
                          }}>
                            {service.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                          <button
                            onClick={() => handleRemoveService(computer.id, service.id, service.name)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: 'transparent',
                              border: '1px solid #b71c1c',
                              borderRadius: '4px',
                              color: '#b71c1c',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
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

      {/* Add Service Dialog */}
      {showServiceDialog && selectedComputer && (
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
              maxWidth: '500px',
              width: '100%',
            }}
          >
            <h3 style={{ color: '#e94560', marginTop: 0 }}>🦙 Add Ollama Service</h3>
            <p style={{ color: '#888', marginBottom: '20px' }}>
              Adding Ollama service to <strong style={{ color: '#eee' }}>{selectedComputer.computerName}</strong>
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#aaa' }}>
                Ollama Base URL
              </label>
              <input
                type="text"
                value={ollamaBaseUrl}
                onChange={(e) => setOllamaBaseUrl(e.target.value)}
                placeholder="http://192.168.1.100:11434"
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#0f3460',
                  border: '1px solid #1a1a2e',
                  borderRadius: '6px',
                  color: '#eee',
                  fontSize: '1rem',
                  fontFamily: 'monospace',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button
                onClick={handleCheckOllama}
                disabled={checkingOllama}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: checkingOllama ? '#0f3460' : '#e94560',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#eee',
                  cursor: checkingOllama ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  opacity: checkingOllama ? 0.7 : 1,
                }}
              >
                {checkingOllama ? '🔍 Checking...' : '🔍 Check Ollama'}
              </button>
            </div>

            {ollamaModels.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#aaa' }}>
                  Available Models ({ollamaModels.length})
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#0f3460',
                    border: '1px solid #1a1a2e',
                    borderRadius: '6px',
                    color: '#eee',
                    fontSize: '1rem',
                  }}
                >
                  {ollamaModels.map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
                <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '8px' }}>
                  Model selection will be used for future features.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleSaveOllamaService}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#e94560',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#eee',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                Add Service
              </button>
              <button
                onClick={() => {
                  setShowServiceDialog(false);
                  setSelectedComputer(null);
                  setOllamaModels([]);
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
