import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import LanDiscovery from './LanDiscovery';

function Settings() {
  const navigate = useNavigate();
  const { config, mode, loadConfig, saveConfig } = useAppStore();
  const [instanceId, setInstanceId] = useState('');
  const [port, setPort] = useState('3000');
  const [pendingMode, setPendingMode] = useState<'server' | 'client' | null>(null);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [exportData, setExportData] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [importData, setImportData] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'lan'>('general');

  useEffect(() => {
    async function load() {
      await loadConfig();
      const id = await window.electronAPI.getInstanceId();
      setInstanceId(id);
    }
    load();
  }, []);

  useEffect(() => {
    if (config) {
      setPort(config.serverPort?.toString() || '3000');
      setPendingMode(config.mode);
    }
  }, [config]);

  const handleSave = async () => {
    if (!pendingMode) {
      setMessage({ type: 'error', text: 'Mode is required' });
      return;
    }

    const modeChanged = pendingMode !== mode;

    await saveConfig({
      mode: pendingMode,
      serverPort: parseInt(port, 10) || 3000,
    });

    if (modeChanged) {
      setShowRestartDialog(true);
    } else {
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleExport = () => {
    const json = JSON.stringify(config, null, 2);
    setExportData(json);
    setShowExport(true);
    setShowImport(false);
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importData);
      saveConfig(parsed);
      setMessage({ type: 'success', text: 'Configuration imported successfully!' });
      setShowImport(false);
      setImportData('');
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: 'Invalid JSON configuration' });
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(exportData);
    setMessage({ type: 'success', text: 'Copied to clipboard!' });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div>
      <h2 style={{ marginBottom: '20px', color: '#e94560' }}>Settings</h2>

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

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #0f3460', paddingBottom: '10px' }}>
        <button
          onClick={() => setActiveTab('general')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'general' ? '#e94560' : '#0f3460',
            border: 'none',
            borderRadius: '6px 6px 0 0',
            color: '#eee',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          ⚙️ General
        </button>
        <button
          onClick={() => setActiveTab('lan')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'lan' ? '#e94560' : '#0f3460',
            border: 'none',
            borderRadius: '6px 6px 0 0',
            color: '#eee',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          🌐 LAN Computers
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'general' ? (
        <>
          {/* Instance Info */}
          <div
            style={{
              padding: '20px',
              backgroundColor: '#16213e',
              borderRadius: '8px',
              border: '1px solid #0f3460',
              marginBottom: '20px',
            }}
          >
            <h3 style={{ marginBottom: '15px', color: '#aaa' }}>Instance Information</h3>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ color: '#888', fontSize: '0.9rem' }}>Instance ID</label>
              <div
                style={{
                  fontFamily: 'monospace',
                  backgroundColor: '#0f3460',
                  padding: '10px',
                  borderRadius: '4px',
                  color: '#eee',
                }}
              >
                {instanceId || 'Loading...'}
              </div>
            </div>
          </div>

          {/* General Settings */}
          <div
            style={{
              padding: '20px',
              backgroundColor: '#16213e',
              borderRadius: '8px',
              border: '1px solid #0f3460',
              marginBottom: '20px',
            }}
          >
            <h3 style={{ marginBottom: '15px', color: '#aaa' }}>General Settings</h3>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#aaa' }}>
                Mode
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setPendingMode('server')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: pendingMode === 'server' ? '#e94560' : '#0f3460',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#eee',
                    cursor: 'pointer',
                    fontSize: '1rem',
                  }}
                >
                  🖥️ Server
                </button>
                <button
                  onClick={() => setPendingMode('client')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: pendingMode === 'client' ? '#e94560' : '#0f3460',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#eee',
                    cursor: 'pointer',
                    fontSize: '1rem',
                  }}
                >
                  📱 Client
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
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

            <button
              onClick={handleSave}
              style={{
                width: '100%',
                padding: '15px',
                backgroundColor: '#e94560',
                border: 'none',
                borderRadius: '8px',
                color: '#eee',
                fontSize: '1.1rem',
                cursor: 'pointer',
              }}
            >
              Save Settings
            </button>
          </div>

          {/* Configuration Export/Import */}
          <div
            style={{
              padding: '20px',
              backgroundColor: '#16213e',
              borderRadius: '8px',
              border: '1px solid #0f3460',
            }}
          >
            <h3 style={{ marginBottom: '15px', color: '#aaa' }}>Configuration</h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={handleExport}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#0f3460',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#eee',
                  cursor: 'pointer',
                }}
              >
                Export Config
              </button>
              <button
                onClick={() => setShowImport(!showImport)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#0f3460',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#eee',
                  cursor: 'pointer',
                }}
              >
                Import Config
              </button>
            </div>

            {showExport && (
              <div style={{ marginTop: '15px' }}>
                <textarea
                  value={exportData}
                  readOnly
                  style={{
                    width: '100%',
                    height: '200px',
                    fontFamily: 'monospace',
                    backgroundColor: '#0f3460',
                    border: '1px solid #1a1a2e',
                    borderRadius: '6px',
                    color: '#eee',
                    padding: '10px',
                    resize: 'vertical',
                  }}
                />
                <button
                  onClick={copyToClipboard}
                  style={{
                    marginTop: '10px',
                    padding: '8px 16px',
                    backgroundColor: '#e94560',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#eee',
                    cursor: 'pointer',
                  }}
                >
                  Copy to Clipboard
                </button>
              </div>
            )}

            {showImport && (
              <div style={{ marginTop: '15px' }}>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder='Paste configuration JSON here...'
                  style={{
                    width: '100%',
                    height: '200px',
                    fontFamily: 'monospace',
                    backgroundColor: '#0f3460',
                    border: '1px solid #1a1a2e',
                    borderRadius: '6px',
                    color: '#eee',
                    padding: '10px',
                    resize: 'vertical',
                  }}
                />
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    onClick={handleImport}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#e94560',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#eee',
                      cursor: 'pointer',
                    }}
                  >
                    Import
                  </button>
                  <button
                    onClick={() => setShowImport(false)}
                    style={{
                      padding: '8px 16px',
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
            )}
          </div>

          {/* Restart Dialog */}
          {showRestartDialog && (
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
                  textAlign: 'center',
                }}
              >
                <h3 style={{ color: '#e94560', marginTop: 0 }}>Restart Required</h3>
                <p style={{ color: '#aaa', marginBottom: '20px' }}>
                  Mode change requires restarting the application.
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => {
                      window.electronAPI.invoke('app:quit');
                    }}
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
                    Restart Now
                  </button>
                  <button
                    onClick={() => setShowRestartDialog(false)}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#0f3460',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#eee',
                      cursor: 'pointer',
                    }}
                  >
                    Later
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <LanDiscovery />
      )}
    </div>
  );
}

export default Settings;
