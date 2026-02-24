import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api';

// Simple in-memory cache for GET requests
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute

const client = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Add cache interceptor
client.interceptors.request.use((config) => {
    if (config.method === 'get' && !config.params?.noCache) {
        const cacheKey = config.url + JSON.stringify(config.params || {});
        const cachedResponse = cache.get(cacheKey);

        if (cachedResponse && (Date.now() - cachedResponse.timestamp < CACHE_TTL)) {
            console.log(`Cache hit for ${config.url}`);
            // Return a resolved promise with the cached data
            // We need to return an object that looks like an axios response
            config.adapter = () => Promise.resolve({
                data: cachedResponse.data,
                status: 200,
                statusText: 'OK',
                headers: {},
                config,
                request: {}
            });
        }
    }
    return config;
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

// Add response interceptor to handle 401 errors and populate cache
client.interceptors.response.use(
    (response) => {
        if (response.config.method === 'get') {
            const cacheKey = response.config.url + JSON.stringify(response.config.params || {});
            cache.set(cacheKey, {
                data: response.data,
                timestamp: Date.now()
            });
        }
        return response;
    },
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
