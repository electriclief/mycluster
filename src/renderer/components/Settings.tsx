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
      setMessage({ type: 'success', text: 'Settings saved!' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleExport = async () => {
    const data = await window.electronAPI.config.export();
    setExportData(data);
    setShowExport(true);
  };

  const handleImport = async () => {
    const success = await window.electronAPI.config.import(importData);
    if (success) {
      setMessage({ type: 'success', text: 'Configuration imported! Restart required.' });
      setShowImport(false);
      setImportData('');
      setShowRestartDialog(true);
    } else {
      setMessage({ type: 'error', text: 'Invalid JSON configuration' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(exportData);
    setMessage({ type: 'success', text: 'Copied to clipboard!' });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div>
      <h2 style={{ marginBottom: '20px', color: '#e94560' }}>Settings</h2>

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
              marginTop: '5px',
              wordBreak: 'break-all',
            }}
          >
            {instanceId || 'Loading...'}
          </div>
        </div>
        <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '10px' }}>
          This ID is used to identify this instance on the LAN. Auth tokens are handled automatically.
        </p>
      </div>

      {/* Mode Selection */}
      <div
        style={{
          padding: '20px',
          backgroundColor: '#16213e',
          borderRadius: '8px',
          border: '1px solid #0f3460',
          marginBottom: '20px',
        }}
      >
        <h3 style={{ marginBottom: '15px', color: '#aaa' }}>Application Mode</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <button
            onClick={() => setPendingMode('server')}
            style={{
              padding: '20px',
              backgroundColor: pendingMode === 'server' ? '#e94560' : '#0f3460',
              border: pendingMode === 'server' ? '2px solid #e94560' : '2px solid transparent',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#eee',
              fontSize: '1rem',
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🖥️</div>
            <strong>Server</strong>
            <div style={{ fontSize: '0.85rem', marginTop: '8px', color: '#aaa' }}>
              Expose APIs for remote control
            </div>
          </button>

          <button
            onClick={() => setPendingMode('client')}
            style={{
              padding: '20px',
              backgroundColor: pendingMode === 'client' ? '#e94560' : '#0f3460',
              border: pendingMode === 'client' ? '2px solid #e94560' : '2px solid transparent',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#eee',
              fontSize: '1rem',
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📱</div>
            <strong>Client</strong>
            <div style={{ fontSize: '0.85rem', marginTop: '8px', color: '#aaa' }}>
              Control remote APIs
            </div>
          </button>
        </div>
      </div>

      {/* Server Configuration */}
      {pendingMode === 'server' && (
        <div
          style={{
            padding: '20px',
            backgroundColor: '#16213e',
            borderRadius: '8px',
            border: '1px solid #0f3460',
            marginBottom: '20px',
          }}
        >
          <h3 style={{ marginBottom: '15px', color: '#aaa' }}>Server Configuration</h3>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#888' }}>
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

      {/* Import/Export */}
      <div
        style={{
          padding: '20px',
          backgroundColor: '#16213e',
          borderRadius: '8px',
          border: '1px solid #0f3460',
          marginBottom: '20px',
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

      {/* Save Button */}
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
      </>

      {activeTab === 'lan' && (
        <LanDiscovery />
      )}

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
              textAlign: 'center',
            }}
          >
            <h3 style={{ color: '#e94560', marginBottom: '15px' }}>Restart Required</h3>
            <p style={{ color: '#aaa', marginBottom: '20px' }}>
              Mode changes require a restart. Please restart the application manually.
            </p>
            <button
              onClick={() => setShowRestartDialog(false)}
              style={{
                padding: '10px 30px',
                backgroundColor: '#e94560',
                border: 'none',
                borderRadius: '6px',
                color: '#eee',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
