import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Enable Pusher logging for debugging
Pusher.logToConsole = true;

// Make Pusher available globally (required by Laravel Echo)
declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo<any>;
    }
}

window.Pusher = Pusher;

const REVERB_APP_KEY = process.env.REACT_APP_REVERB_APP_KEY || '5uzfsf7jv9rmk46zgbrz';
const REVERB_HOST = process.env.REACT_APP_REVERB_HOST || '127.0.0.1';
const REVERB_PORT = parseInt(process.env.REACT_APP_REVERB_PORT || '6001');
const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

class EchoService {
    private echo: Echo<any> | null = null;
    private connected: boolean = false;

    connect(): Echo<any> {
        if (this.echo) {
            return this.echo;
        }

        console.log('Connecting to Reverb:', {
            host: REVERB_HOST,
            port: REVERB_PORT,
            key: REVERB_APP_KEY
        });

        const token = localStorage.getItem('token');
        this.echo = new Echo({
            broadcaster: 'reverb',
            key: REVERB_APP_KEY,
            wsHost: REVERB_HOST,
            wsPort: REVERB_PORT,
            wssPort: REVERB_PORT,
            forceTLS: (process.env.REACT_APP_REVERB_SCHEME || 'http') === 'https',
            enabledTransports: ['ws', 'wss'],
            authEndpoint: `${API_URL}/api/broadcasting/auth`,
            auth: {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        });

        // Connection state tracking
        this.echo.connector.pusher.connection.bind('connected', () => {
            console.log('Reverb connected');
            this.connected = true;
        });

        this.echo.connector.pusher.connection.bind('disconnected', () => {
            console.log('Reverb disconnected');
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
            console.log('New account request received:', data);
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
            console.log('New activity log received:', data);
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
