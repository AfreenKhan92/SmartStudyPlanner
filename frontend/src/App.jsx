import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute  from './components/ProtectedRoute';
import Login      from './pages/Login';
import Signup     from './pages/Signup';
import Dashboard  from './pages/Dashboard';
import InputForm  from './pages/InputForm';
import Planner    from './pages/Planner';
import Subjects   from './pages/Subjects';
import Progress   from './pages/Progress';
import Profile    from './pages/Profile';
import EditProfile from './pages/EditProfile';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Dynamic Background */}
        <div className="ambient-bg">
          <div className="ambient-blob blob-1"></div>
          <div className="ambient-blob blob-2"></div>
          <div className="ambient-blob blob-3"></div>
        </div>
        <div className="dot-bg"></div>

        <Routes>
          {/* Public */}
          <Route path="/login"  element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected */}
          <Route path="/dashboard"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/plan"        element={<ProtectedRoute><InputForm /></ProtectedRoute>} />
          <Route path="/planner"     element={<ProtectedRoute><Planner /></ProtectedRoute>} />
          <Route path="/subjects"    element={<ProtectedRoute><Subjects /></ProtectedRoute>} />
          <Route path="/progress"    element={<ProtectedRoute><Progress /></ProtectedRoute>} />
          <Route path="/profile"     element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/profile/edit" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
