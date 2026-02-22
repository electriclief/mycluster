import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import SetupWizard from './components/SetupWizard';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="setup" element={<SetupWizard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
