import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import SetupWizard from './components/SetupWizard';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import JobQueue from './components/JobQueue';
import ResultsViewer from './components/ResultsViewer';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="setup" element={<SetupWizard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="jobs" element={<JobQueue />} />
          <Route path="results" element={<ResultsViewer />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
