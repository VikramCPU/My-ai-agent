import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Repositories from './pages/Repositories';
import FileEditor from './pages/FileEditor';
import BuildStatus from './pages/BuildStatus';
import ErrorLogs from './pages/ErrorLogs';
import Settings from './pages/Settings';
import AndroidGenerator from './pages/AndroidGenerator';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="chat" element={<Chat />} />
        <Route path="repositories" element={<Repositories />} />
        <Route path="editor" element={<FileEditor />} />
        <Route path="builds" element={<BuildStatus />} />
        <Route path="logs" element={<ErrorLogs />} />
        <Route path="settings" element={<Settings />} />
        <Route path="android" element={<AndroidGenerator />} />
      </Route>
    </Routes>
  );
}
