import axios from 'axios';

// AI service runs on port 8001
const AI_SERVICE_URL = 'http://127.0.0.1:8001/api';

const aiClient = axios.create({
  baseURL: AI_SERVICE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

aiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  proposed_action?: any;
}

export interface ChatRequest {
  session_id?: string;
  message: string;
  auth_token?: string;
}

export interface ChatResponse {
  session_id: string;
  ai_message: ChatMessage;
}

export const roleProfileChatbotApi = {
  sendMessage: async (request: ChatRequest): Promise<ChatResponse> => {
    const token = localStorage.getItem('token');
    const response = await aiClient.post('/role-profile/chatbot/message', {
      ...request,
      auth_token: token,
    });
    return response.data;
  },
};
