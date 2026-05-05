import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

const enablePusherDebug = process.env.REACT_APP_PUSHER_DEBUG === 'true';
Pusher.logToConsole = enablePusherDebug;

// Make Pusher available globally (required by Laravel Echo)
declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo<any>;
    }
}

(globalThis as typeof globalThis & { Pusher: typeof Pusher }).Pusher = Pusher;

const REVERB_APP_KEY = process.env.REACT_APP_REVERB_APP_KEY || '5uzfsf7jv9rmk46zgbrz';
const REVERB_HOST = process.env.REACT_APP_REVERB_HOST || window.location.hostname;
const REVERB_PORT = Number.parseInt(process.env.REACT_APP_REVERB_PORT || '6001', 10);
const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
const REVERB_SCHEME = process.env.REACT_APP_REVERB_SCHEME || window.location.protocol.replace(':', '');
const USE_TLS = REVERB_SCHEME === 'https';

class EchoService {
    private echo: Echo<any> | null = null;
    private connected: boolean = false;

    connect(): Echo<any> {
        if (this.echo) {
            return this.echo;
        }

        const token = localStorage.getItem('token');
        this.echo = new Echo({
            broadcaster: 'reverb',
            key: REVERB_APP_KEY,
            wsHost: REVERB_HOST,
            wsPort: REVERB_PORT,
            wssPort: REVERB_PORT,
            forceTLS: USE_TLS,
            enabledTransports: USE_TLS ? ['ws', 'wss'] : ['ws'],
            authEndpoint: `${API_URL}/broadcasting/auth`,
            auth: {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        });

        // Connection state tracking
        this.echo.connector.pusher.connection.bind('connected', () => {
            this.connected = true;
        });

        this.echo.connector.pusher.connection.bind('disconnected', () => {
            this.connected = false;
        });

        this.echo.connector.pusher.connection.bind('error', (error: any) => {
            console.error('Reverb connection error:', error);
        });

        return this.echo;
    }

    disconnect(): void {
        if (this.echo) {
            this.echo.disconnect();
            this.echo = null;
            this.connected = false;
        }
    }

    // Subscribe to RH notifications channel
    subscribeToRHNotifications(callback: (data: any) => void): () => void {
        const echo = this.connect();
        
        const channel = echo.channel('rh-notifications');
        
        channel.listen('.new-account-request', (data: any) => {
            callback(data);
        });

        return () => {
            echo.leaveChannel('rh-notifications');
        };
    }

    // Subscribe to private RH notifications
    subscribeToPrivateRH(callback: (data: any) => void): () => void {
        const echo = this.connect();
        const channel = echo.private('rh.notifications');

        channel.listen('.NewActivityLog', (data: any) => {
            callback(data);
        });

        return () => {
            echo.leaveChannel('rh.notifications');
        };
    }

    // Generic channel subscription
    subscribeToChannel(channelName: string, eventName: string, callback: (data: any) => void, isPrivate = false): () => void {
        const echo = this.connect();
        
        const channel = isPrivate ? echo.private(channelName) : echo.channel(channelName);
        
        // Event name should start with '.' for custom event names
        const formattedEventName = eventName.startsWith('.') ? eventName : `.${eventName}`;
        
        channel.listen(formattedEventName, callback);

        return () => {
            echo.leaveChannel(channelName);
        };
    }

    isConnected(): boolean {
        return this.connected;
    }

    getEcho(): Echo<any> | null {
        return this.echo;
    }
}

const echoService = new EchoService();
export default echoService;
