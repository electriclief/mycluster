import { useEffect, useState } from 'react';

function App() {
  const [version, setVersion] = useState<string>('');
  const [platform, setPlatform] = useState<string>('');
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);

  useEffect(() => {
    async function loadInfo() {
      const v = await window.electronAPI.getVersion();
      const p = await window.electronAPI.getPlatform();
      const first = await window.electronAPI.isFirstLaunch();
      setVersion(v);
      setPlatform(p);
      setIsFirstLaunch(first);
    }
    loadInfo();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>MyCluster</h1>
      <div style={{ marginTop: '20px' }}>
        <h2>App Info</h2>
        <p><strong>Version:</strong> {version}</p>
        <p><strong>Platform:</strong> {platform}</p>
        <p><strong>First Launch:</strong> {isFirstLaunch === null ? 'Loading...' : isFirstLaunch ? 'Yes' : 'No'}</p>
      </div>
      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
        <h3>Getting Started</h3>
        <p>
          {isFirstLaunch 
            ? "👋 Welcome! This is your first time launching MyCluster. Setup wizard coming soon..."
            : "✅ App is configured and ready to use."}
        </p>
      </div>
    </div>
  );
}

export default App;
