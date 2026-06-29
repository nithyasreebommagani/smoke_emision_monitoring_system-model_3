import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Violations from './pages/Violations';
import Reports from './pages/Reports';
import Cameras from './pages/Cameras';
import Login from './pages/Login';
import Evidence from './pages/Evidence';
import NotificationToast from './components/NotificationToast';
import { authService } from './services/api';

// Simple Route Guard to protect layout views
const PrivateRoute = ({ children }) => {
  return authService.isAuthenticated() ? children : <Navigate to="/login" replace />;
};

const MainLayout = ({ children, newViolationTrigger, onViewEvidence }) => {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        {React.cloneElement(children, { newViolationTrigger, onViewEvidence })}
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

  // WebSocket Connection for real-time notifications
  useEffect(() => {
    if (!isAuthenticated || location.pathname === '/login') return;

    // Detect websocket protocol and host
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host === '3000' || window.location.host.startsWith('localhost:3000') 
      ? 'localhost:8000' 
      : window.location.host;
    
    const wsUrl = `${wsProto}//${wsHost}/ws`;
    
    console.log(`Connecting to WebSocket at: ${wsUrl}`);
    let ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        console.log("WebSocket Alert Received:", payload);
        
        // Add toast notification
        const toastId = payload.id || Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { ...payload, id: toastId }]);
        
        // Trigger dashboard re-fetch
        setNewViolationTrigger((prev) => prev + 1);

        // Auto dismiss toast after 5 seconds
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toastId));
        }, 5000);
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket closed. Attempting reconnect in 5 seconds...");
      setTimeout(() => {
        // Simple reconnect logic
        if (authService.isAuthenticated()) {
          setNewViolationTrigger((prev) => prev + 1);
        }
      }, 5000);
    };

    return () => {
      ws.close();
    };
  }, [isAuthenticated, location.pathname]);

  const handleDismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleViewEvidence = (id) => {
    setSelectedViolationId(id);
  };

  const handleCloseEvidence = () => {
    setSelectedViolationId(null);
  };

  const handleRefreshData = () => {
    // Increment trigger to reload active components
    setNewViolationTrigger((prev) => prev + 1);
  };

  return (
    <>
      <Routes>
        <Route path="/login" element={
          authService.isAuthenticated() ? <Navigate to="/" replace /> : <Login />
        } />
        
        <Route path="/" element={
          <PrivateRoute>
            <MainLayout newViolationTrigger={newViolationTrigger} onViewEvidence={handleViewEvidence}>
              <Dashboard />
            </MainLayout>
          </PrivateRoute>
        } />
        
        <Route path="/violations" element={
          <PrivateRoute>
            <MainLayout newViolationTrigger={newViolationTrigger} onViewEvidence={handleViewEvidence}>
              <Violations />
            </MainLayout>
          </PrivateRoute>
        } />
        
        <Route path="/reports" element={
          <PrivateRoute>
            <MainLayout newViolationTrigger={newViolationTrigger} onViewEvidence={handleViewEvidence}>
              <Reports />
            </MainLayout>
          </PrivateRoute>
        } />
        
        <Route path="/cameras" element={
          <PrivateRoute>
            <MainLayout newViolationTrigger={newViolationTrigger} onViewEvidence={handleViewEvidence}>
              <Cameras />
            </MainLayout>
          </PrivateRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global Real-time WebSockets Toasts */}
      <NotificationToast toasts={toasts} onDismiss={handleDismissToast} />

      {/* Global Evidence View Modal */}
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
