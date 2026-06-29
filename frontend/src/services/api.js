import axios from 'axios';

// Detect API base URL
// In development Vite proxy takes care of '/api'
// In production it calls the same host or environment variable configured API
const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically attach authorization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiry / redirection
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('username');
      // If we are not on the login page, redirect to login
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('userRole', response.data.role);
      localStorage.setItem('username', username);
    }
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    window.location.href = '/login';
  },
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },
  getUserRole: () => {
    return localStorage.getItem('userRole') || 'operator';
  },
  getUsername: () => {
    return localStorage.getItem('username') || '';
  }
};

export const violationService = {
  getViolations: async (params) => {
    const response = await api.get('/violations', { params });
    return response.data;
  },
  getViolationDetails: async (id) => {
    const response = await api.get(`/violations/${id}`);
    return response.data;
  },
  updateStatus: async (id, status) => {
    const response = await api.put(`/violations/${id}/status`, { status });
    return response.data;
  }
};

export const dashboardService = {
  getSummary: async () => {
    const response = await api.get('/dashboard/summary');
    return response.data;
  }
};

export const reportService = {
  getReports: async () => {
    const response = await api.get('/reports');
    return response.data;
  }
};

export const cameraService = {
  getCameras: async () => {
    const response = await api.get('/cameras');
    return response.data;
  },
  registerCamera: async (cameraData) => {
    const response = await api.post('/cameras', cameraData);
    return response.data;
  }
};

export default api;
