import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation
} from 'react-router-dom';

import Sidebar from './components/Sidebar';
import NotificationToast from './components/NotificationToast';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Violations from './pages/Violations';
import Reports from './pages/Reports';
import Cameras from './pages/Cameras';
import Login from './pages/Login';
import Register from './pages/Register';
import Evidence from './pages/Evidence';

import { authService } from './services/api';

// Route Guard
const PrivateRoute = ({ children }) => {
  return authService.isAuthenticated()
    ? children
    : <Navigate to="/login" replace />;
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

const AppContent = () => {
  const [toasts, setToasts] = useState([]);
  const [newViolationTrigger, setNewViolationTrigger] = useState(0);
  const [selectedViolationId, setSelectedViolationId] = useState(null);

  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();

  useEffect(() => {
    if (
      !isAuthenticated ||
      location.pathname === '/login' ||
      location.pathname === '/register'
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
            ...payload,
            id: toastId
          }
        ]);

        setNewViolationTrigger((prev) => prev + 1);

        setTimeout(() => {
          setToasts((prev) =>
            prev.filter((t) => t.id !== toastId)
          );
        }, 5000);

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
              ? <Navigate to="/" replace />
              : <Login />
          }
        />

        {/* Register */}
        <Route
          path="/register"
          element={
            authService.isAuthenticated()
              ? <Navigate to="/" replace />
              : <Register />
          }
        />

        {/* Dashboard */}
        <Route
          path="/"
          element={<Home />}
        />
        <Route
          path="/portal"
          element={
            <PrivateRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </PrivateRoute>
          }
        />
        {/* Violations */}
        <Route
          path="/violations"
          element={
            <PrivateRoute>
              <MainLayout
                newViolationTrigger={newViolationTrigger}
                onViewEvidence={handleViewEvidence}
              >
                <Violations />
              </MainLayout>
            </PrivateRoute>
          }
        />

        {/* Reports */}
        <Route
          path="/reports"
          element={
            <PrivateRoute>
              <MainLayout
                newViolationTrigger={newViolationTrigger}
                onViewEvidence={handleViewEvidence}
              >
                <Reports />
              </MainLayout>
            </PrivateRoute>
          }
        />

        {/* Cameras */}
        <Route
          path="/cameras"
          element={
            <PrivateRoute>
              <MainLayout
                newViolationTrigger={newViolationTrigger}
                onViewEvidence={handleViewEvidence}
              >
                <Cameras />
              </MainLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>

      <NotificationToast
        toasts={toasts}
        onDismiss={handleDismissToast}
      />

      {selectedViolationId && (
        <Evidence
          violationId={selectedViolationId}
          onClose={handleCloseEvidence}
          onRefresh={handleRefreshData}
        />
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