import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (credentials: any) => {
    const response = await api.post('/auth/login', credentials);
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    return response.data;
  },
  register: async (userData: any) => {
    const response = await api.post('/auth/register', userData);
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
};

export const profileService = {
  updateProfile: async (healthConditions: string[], allergies: string[]) => {
    const response = await api.put('/profile', { healthConditions, allergies });
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const updatedUser = { ...user, healthConditions: response.data.healthConditions, allergies: response.data.allergies };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    return updatedUser;
  },
  getProfile: async () => {
    const response = await api.get('/profile');
    return response.data;
  }
};

export const scanService = {
  performScan: async (imageFile: File) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    const response = await api.post('/scan', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  getHistory: async () => {
    const response = await api.get('/scan/history');
    return response.data;
  },
  saveResults: async (analysis: any, imageData: string) => {
    // Backend performScan now saves results automatically if authenticated.
    // This endpoint can be used if we need to explicitly save a specific analysis.
    const response = await api.post('/scan/save', { analysis, imageData });
    return response.data;
  }
};

export default api;
