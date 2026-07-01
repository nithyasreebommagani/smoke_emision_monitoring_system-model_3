import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation
} from 'react-router-dom';

import Sidebar from './components/Sidebar';
import UserSidebar from './components/UserSidebar';
import NotificationToast from './components/NotificationToast';
import UploadVideo from "./pages/UploadVideo";
import Dashboard from './pages/Dashboard';
import Violations from './pages/Violations';
import Reports from './pages/Reports';
import Cameras from './pages/Cameras';
import Login from './pages/Login';
import Register from './pages/Register';
import Evidence from './pages/Evidence';

// User Portal Pages
import UserSignup from './pages/UserSignup';
import UserDashboard from './pages/user/UserDashboard';
import UserUpload from './pages/user/UserUpload';
import UserViolations from './pages/user/UserViolations';
import UserEvidence from './pages/user/UserEvidence';
import UserLiveCamera from './pages/user/UserLiveCamera';

import { authService } from './services/api';

// Route Guards
const AdminRoute = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  const role = authService.getUserRole();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role !== 'admin') return <Navigate to="/user/dashboard" replace />;
  return children;
};

const UserRoute = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  const role = authService.getUserRole();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role === 'admin') return <Navigate to="/" replace />;
  return children;
};

const MainLayout = ({ children, newViolationTrigger, onViewEvidence }) => {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        {React.cloneElement(children, {
          newViolationTrigger,
          onViewEvidence
        })}
      </div>
    </div>
  );
};

const UserLayout = ({ children, newViolationTrigger, onViewEvidence }) => {
  return (
    <div className="app-container">
      <UserSidebar />
      <div className="main-content">
        {React.cloneElement(children, {
          newViolationTrigger,
          onViewEvidence
        })}
      </div>
    </div>
  );
};

const AppContent = () => {
  const [toasts, setToasts] = useState([]);
  const [newViolationTrigger, setNewViolationTrigger] = useState(0);
  const [selectedViolationId, setSelectedViolationId] = useState(null);

  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();
  const role = authService.getUserRole();
  const isAdmin = role === 'admin';

  useEffect(() => {
    if (
      !isAuthenticated ||
      location.pathname === '/login' ||
      location.pathname === '/register' ||
      location.pathname === '/signup'
    ) {
      return;
    }

    const wsProto =
      window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    const wsHost =
      window.location.host === '3000' ||
      window.location.host.startsWith('localhost:3000')
        ? 'localhost:8000'
        : window.location.host;

    const wsUrl = `${wsProto}//${wsHost}/ws`;

    console.log(`Connecting to WebSocket: ${wsUrl}`);

    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        const toastId =
          payload.id ||
          Math.random().toString(36).substring(2, 9);

        setToasts((prev) => [
          ...prev,
          {
            id: toastId,
            ...payload
          }
        ]);

        setNewViolationTrigger((prev) => prev + 1);

        setTimeout(() => {
          setToasts((prev) =>
            prev.filter((t) => t.id !== toastId)
          );
        }, 6000);

      } catch (err) {
        console.error('WebSocket parse error:', err);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    return () => ws.close();

  }, [isAuthenticated, location.pathname]);

  const handleDismissToast = (id) => {
    setToasts((prev) =>
      prev.filter((t) => t.id !== id)
    );
  };

  const handleViewEvidence = (id) => {
    setSelectedViolationId(id);
  };

  const handleCloseEvidence = () => {
    setSelectedViolationId(null);
  };

  const handleRefreshData = () => {
    setNewViolationTrigger((prev) => prev + 1);
  };

  return (
    <>
      <Routes>

        {/* Login */}
        <Route
          path="/login"
          element={
            authService.isAuthenticated()
              ? (isAdmin ? <Navigate to="/" replace /> : <Navigate to="/user/dashboard" replace />)
              : <Login />
          }
        />

        {/* Register (Existing Admin flow) */}
        <Route
          path="/register"
          element={
            authService.isAuthenticated()
              ? <Navigate to="/" replace />
              : <Register />
          }
        />

        {/* Signup (New User signup flow) */}
        <Route
          path="/signup"
          element={
            authService.isAuthenticated()
              ? <Navigate to="/user/dashboard" replace />
              : <UserSignup />
          }
        />

        {/* Admin Dashboard */}
        <Route
          path="/"
          element={
            <AdminRoute>
              <MainLayout
                newViolationTrigger={newViolationTrigger}
                onViewEvidence={handleViewEvidence}
              >
                <Dashboard />
              </MainLayout>
            </AdminRoute>
          }
        />

        {/* Admin Video Ingestion / Upload */}
        <Route
          path="/upload"
          element={
            <AdminRoute>
              <MainLayout
                newViolationTrigger={newViolationTrigger}
                onViewEvidence={handleViewEvidence}
              >
                <UploadVideo />
              </MainLayout>
            </AdminRoute>
          }
        />

        {/* Admin Violations */}
        <Route
          path="/violations"
          element={
            <AdminRoute>
              <MainLayout
                newViolationTrigger={newViolationTrigger}
                onViewEvidence={handleViewEvidence}
              >
                <Violations />
              </MainLayout>
            </AdminRoute>
          }
        />

        {/* Admin Reports */}
        <Route
          path="/reports"
          element={
            <AdminRoute>
              <MainLayout
                newViolationTrigger={newViolationTrigger}
                onViewEvidence={handleViewEvidence}
              >
                <Reports />
              </MainLayout>
            </AdminRoute>
          }
        />

        {/* Admin Cameras */}
        <Route
          path="/cameras"
          element={
            <AdminRoute>
              <MainLayout
                newViolationTrigger={newViolationTrigger}
                onViewEvidence={handleViewEvidence}
              >
                <Cameras />
              </MainLayout>
            </AdminRoute>
          }
        />

        {/* User Portal Routes */}
        <Route
          path="/user/dashboard"
          element={
            <UserRoute>
              <UserLayout
                newViolationTrigger={newViolationTrigger}
                onViewEvidence={handleViewEvidence}
              >
                <UserDashboard />
              </UserLayout>
            </UserRoute>
          }
        />

        <Route
          path="/user/upload"
          element={
            <UserRoute>
              <UserLayout
                newViolationTrigger={newViolationTrigger}
                onViewEvidence={handleViewEvidence}
              >
                <UserUpload />
              </UserLayout>
            </UserRoute>
          }
        />

        <Route
          path="/user/violations"
          element={
            <UserRoute>
              <UserLayout
                newViolationTrigger={newViolationTrigger}
                onViewEvidence={handleViewEvidence}
              >
                <UserViolations />
              </UserLayout>
            </UserRoute>
          }
        />

        <Route
          path="/user/live-camera"
          element={
            <UserRoute>
              <UserLayout
                newViolationTrigger={newViolationTrigger}
                onViewEvidence={handleViewEvidence}
              >
                <UserLiveCamera />
              </UserLayout>
            </UserRoute>
          }
        />

        <Route
          path="*"
          element={isAdmin ? <Navigate to="/" replace /> : <Navigate to="/user/dashboard" replace />}
        />

      </Routes>

      <NotificationToast
        toasts={toasts}
        onDismiss={handleDismissToast}
      />

      {selectedViolationId && (
        isAdmin ? (
          <Evidence
            violationId={selectedViolationId}
            onClose={handleCloseEvidence}
            onRefresh={handleRefreshData}
          />
        ) : (
          <UserEvidence
            violationId={selectedViolationId}
            onClose={handleCloseEvidence}
          />
        )
      )}
    </>
  );
};

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;