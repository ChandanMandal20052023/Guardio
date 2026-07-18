import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
// Import your fresh interfaces from the new types location
import { 
  Transaction, 
  Alert, 
  WeeklySpending, 
  SpendingByCategory, 
  MonthlyTrend 
} from '../types/guardio';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuth.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/token/') {
      originalRequest._retry = true;
      
      try {
        const { refreshToken, setTokens, logout } = useAuth.getState();
        
        if (!refreshToken) {
          logout();
          return Promise.reject(error);
        }

        // Try to refresh token
        const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
          refresh: refreshToken
        });

        const newAccessToken = response.data.access;
        // SimpleJWT refresh endpoint usually only returns new access token by default unless rotated
        const newRefreshToken = response.data.refresh || refreshToken; 

        setTokens(newAccessToken, newRefreshToken);
        
        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
        
      } catch (refreshError) {
        // Refresh failed, log out
        useAuth.getState().logout();
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// Phase 12 - Guardio Core Data Endpoints (Communicating with PostgreSQL)
// ---------------------------------------------------------------------------
export const guardioApi = {
  // Fetch users' transactions
  getTransactions: async (): Promise<Transaction[]> => {
    const response = await api.get<Transaction[]>('/transactions/');
    return response.data;
  },

  // Fetch security alerts 
  getAlerts: async (): Promise<Alert[]> => {
    const response = await api.get<Alert[]>('/alerts/');
    return response.data;
  },

  // Fetch dashboard metrics and analytic charts data matrices
  getWeeklySpending: async (): Promise<WeeklySpending[]> => {
    const response = await api.get<WeeklySpending[]>('/analytics/weekly/');
    return response.data;
  },

  getSpendingByCategory: async (): Promise<SpendingByCategory[]> => {
    const response = await api.get<SpendingByCategory[]>('/analytics/category/');
    return response.data;
  },

  getMonthlyTrend: async (): Promise<MonthlyTrend[]> => {
    const response = await api.get<MonthlyTrend[]>('/analytics/trend/');
    return response.data;
  },
};

export default api;