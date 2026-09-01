import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { 
  Transaction, 
  Alert, 
  WeeklySpending, 
  SpendingByCategory, 
  MonthlyTrend 
} from '../types/guardio';

const rawUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const cleanUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
const API_BASE_URL = cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;

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
// Guardio Core Endpoints
// ---------------------------------------------------------------------------
export const guardioApi = {
  // Fetch users' transactions
  getTransactions: async (): Promise<Transaction[]> => {
    const response = await api.get('/transactions/');
    const data = response.data?.results || response.data || [];
    return data.map((t: any) => ({
      id: t.transaction_id,
      merchant: t.merchant,
      amount: parseFloat(t.amount_inr),
      date: t.timestamp,
      status: (t.status || 'SAFE').toLowerCase(),
      category: 'Shopping',
      cardLast4: t.card_number ? t.card_number.slice(-4) : '0000',
      location: t.location,
      reason: t.prediction_reason,
      confidence: t.confidence_score ? parseFloat(t.confidence_score) : undefined,
    }));
  },

  // Create and immediately score transaction
  createTransaction: async (data: {
    amount_inr: number;
    merchant: string;
    location: string;
    card_number: string;
    timestamp: string;
    card?: number;
    user?: string;
  }) => {
    const response = await api.post('/transactions/', data);
    return response.data;
  },

  // Standalone real-time risk scoring endpoint
  predictRisk: async (data: {
    amount_inr: number;
    merchant: string;
    location: string;
    card_network?: string;
    issuing_bank?: string;
    credit_limit?: number;
    timestamp?: string;
  }) => {
    const response = await api.post('/transactions/predict/', data);
    return response.data;
  },

  // Fetch security alerts 
  getAlerts: async (): Promise<Alert[]> => {
    const response = await api.get('/transactions/alerts/');
    const data = response.data?.results || response.data || [];
    return data.map((a: any) => ({
      id: String(a.alert_id),
      type: (a.prediction || 'FRAUD').toLowerCase(),
      title: `${a.prediction || 'Fraud'} Alert (${a.severity})`,
      description: a.reason || 'Unusual activity detected by Guardio AI',
      timestamp: a.timestamp,
      resolved: a.status === 'RESOLVED',
      transactionId: a.transaction?.transaction_id || String(a.transaction),
    }));
  },

  // Fetch overview metrics
  getOverview: async () => {
    const response = await api.get('/transactions/summary/overview/');
    return response.data;
  },

  // Fetch analytic charts data matrices
  getWeeklySpending: async (): Promise<WeeklySpending[]> => {
    const response = await api.get('/transactions/summary/by-month/');
    return (response.data || []).map((item: any) => ({
      day: item.label,
      amount: parseFloat(item.total_amount || 0)
    }));
  },

  getSpendingByCategory: async (): Promise<SpendingByCategory[]> => {
    const response = await api.get('/transactions/summary/by-merchant/');
    return (response.data || []).map((item: any) => ({
      category: item.label,
      amount: parseFloat(item.total_amount || 0)
    }));
  },

  getMonthlyTrend: async (): Promise<MonthlyTrend[]> => {
    const response = await api.get('/transactions/summary/by-month/');
    return (response.data || []).map((item: any) => ({
      month: item.label,
      amount: parseFloat(item.total_amount || 0)
    }));
  },
};

export default api;