import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
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
      // Removed window.location.href to allow ProtectedRoute to handle redirection gracefully
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (credentials: any) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const mockUser = {
      userId: 'mock-123',
      name: credentials.email.split('@')[0],
      email: credentials.email,
      token: 'mock-token'
    };
    localStorage.setItem('token', mockUser.token);
    localStorage.setItem('user', JSON.stringify(mockUser));
    return { token: mockUser.token, user: mockUser, email: mockUser.email };
  },
  register: async (userData: any) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const mockUser = {
      userId: 'mock-123',
      name: userData.name,
      email: userData.email,
      token: 'mock-token'
    };
    localStorage.setItem('token', mockUser.token);
    localStorage.setItem('user', JSON.stringify(mockUser));
    return { token: mockUser.token, user: mockUser };
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
    await new Promise(resolve => setTimeout(resolve, 800));
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const updatedUser = { 
      ...user, 
      healthConditions,
      allergies 
    };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    return updatedUser;
  },
  getProfile: async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return {
      healthConditions: user.healthConditions || [],
      allergies: user.allergies || []
    };
  }
};

export const scanService = {
  performScan: async (imageFile: File) => {
    // This is currently handled in the frontend Scan.tsx but keeping standard structure
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
    await new Promise(resolve => setTimeout(resolve, 800));
    const history = JSON.parse(localStorage.getItem('mockHistory') || '[]');
    return history;
  },
  saveResults: async (analysis: any, imageData: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const history = JSON.parse(localStorage.getItem('mockHistory') || '[]');
    const newScan = {
      ...analysis,
      id: Date.now().toString(),
      imageUrl: imageData,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('mockHistory', JSON.stringify([newScan, ...history].slice(0, 10)));
    return { success: true };
  }
};

export default api;
