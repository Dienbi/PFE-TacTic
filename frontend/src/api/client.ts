import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api';

const client = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Add interceptor to add token to requests
client.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            console.warn('No token found in localStorage');
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor to handle 401 errors
client.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.error('Authentication failed - redirecting to login');
            // Clear invalid token
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Redirect to login
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default client;
