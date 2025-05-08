const API_BASE_URL = import.meta.env.VITE_LINK_CLOUD_SERVER_URL;

export const api = {
  async fetch(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // 토큰이 만료되었거나 유효하지 않은 경우
      localStorage.removeItem('token');
      window.location.href = '/login';
      throw new Error('Authentication failed');
    }

    if (!response.ok) {
      throw new Error('API request failed');
    }

    return response.json();
  },

  get(endpoint: string, options: RequestInit = {}) {
    return this.fetch(endpoint, { ...options, method: 'GET' });
  },

  post(endpoint: string, data: any, options: RequestInit = {}) {
    return this.fetch(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  put(endpoint: string, data: any, options: RequestInit = {}) {
    return this.fetch(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete(endpoint: string, options: RequestInit = {}) {
    return this.fetch(endpoint, { ...options, method: 'DELETE' });
  },
}; 