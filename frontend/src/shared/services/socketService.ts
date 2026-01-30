import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

class SocketService {
    private socket: Socket | null = null;
    private listeners: Map<string, Set<(data: any) => void>> = new Map();

    connect(): void {
        if (this.socket?.connected) {
            return;
        }

        this.socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
        });

        this.socket.on('connect', () => {
            console.log('Socket connected:', this.socket?.id);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        // Re-register all listeners when reconnecting
        this.socket.on('reconnect', () => {
            console.log('Socket reconnected');
        });
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    // Join RH notifications room
    joinRHRoom(userId: number): void {
        if (this.socket?.connected) {
            this.socket.emit('rh:join', userId);
        }
    }

    // Subscribe to new account request notifications
    onNewAccountRequest(callback: (data: any) => void): () => void {
        const event = 'new-account-request';
        
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        
        this.listeners.get(event)?.add(callback);
        
        if (this.socket) {
            this.socket.on(event, callback);
        }

        // Return unsubscribe function
        return () => {
            this.listeners.get(event)?.delete(callback);
            if (this.socket) {
                this.socket.off(event, callback);
            }
        };
    }

    // Generic event listener
    on(event: string, callback: (data: any) => void): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        
        this.listeners.get(event)?.add(callback);
        
        if (this.socket) {
            this.socket.on(event, callback);
        }

        return () => {
            this.listeners.get(event)?.delete(callback);
            if (this.socket) {
                this.socket.off(event, callback);
            }
        };
    }

    isConnected(): boolean {
        return this.socket?.connected ?? false;
    }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;
