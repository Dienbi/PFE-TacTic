import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://backend.test/api';

const client = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

client.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

client.interceptors.response.use(
    (response) => response,
    (error) => {
        const requestUrl = error.config?.url ?? '';
        const isAuthRequest = requestUrl.includes('/auth/login')
            || requestUrl.includes('/auth/register')
            || requestUrl.includes('/auth/logout');

        if (error.response?.status === 401 && !isAuthRequest) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            globalThis.location.href = '/login';
        }
        return Promise.reject(error);
    },
);

export default client;
