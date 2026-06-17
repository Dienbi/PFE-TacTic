import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

const enablePusherDebug = process.env.REACT_APP_PUSHER_DEBUG === 'true';
Pusher.logToConsole = enablePusherDebug;

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo<any>;
    }
}

(globalThis as typeof globalThis & { Pusher: typeof Pusher }).Pusher = Pusher;

const ENABLE_REVERB = process.env.REACT_APP_ENABLE_REVERB === 'true';
const REVERB_APP_KEY = process.env.REACT_APP_REVERB_APP_KEY || '5uzfsf7jv9rmk46zgbrz';
const REVERB_HOST = process.env.REACT_APP_REVERB_HOST || window.location.hostname;
const REVERB_PORT = Number.parseInt(process.env.REACT_APP_REVERB_PORT || '6001', 10);
const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';
const API_BASE = API_URL.replace(/\/api\/?$/, '');
const REVERB_SCHEME = process.env.REACT_APP_REVERB_SCHEME || window.location.protocol.replace(':', '');
const USE_TLS = REVERB_SCHEME === 'https';

type EchoChannel = {
    listen: (...args: any[]) => EchoChannel;
    notification?: (...args: any[]) => EchoChannel;
};

function createNoOpEcho(): Echo<any> {
    const noopChannel: EchoChannel = {
        listen: () => noopChannel,
        notification: () => noopChannel,
    };

    return {
        channel: () => noopChannel,
        private: () => noopChannel,
        leave: () => undefined,
        leaveChannel: () => undefined,
        disconnect: () => undefined,
        connector: {
            pusher: {
                connection: {
                    bind: () => undefined,
                },
            },
        },
    } as unknown as Echo<any>;
}

class EchoService {
    private echo: Echo<any> | null = null;
    private connected: boolean = false;
    private disabled: boolean = false;

    isEnabled(): boolean {
        return ENABLE_REVERB && !this.disabled;
    }

    connect(): Echo<any> {
        if (!ENABLE_REVERB) {
            if (!this.echo) {
                this.echo = createNoOpEcho();
            }
            return this.echo;
        }

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
            authEndpoint: `${API_BASE}/broadcasting/auth`,
            auth: {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        });

        this.echo.connector.pusher.connection.bind('connected', () => {
            this.connected = true;
            this.disabled = false;
        });

        this.echo.connector.pusher.connection.bind('disconnected', () => {
            this.connected = false;
        });

        this.echo.connector.pusher.connection.bind('error', () => {
            if (!this.connected) {
                this.disabled = true;
                this.echo?.disconnect();
                this.echo = createNoOpEcho();
                if (enablePusherDebug) {
                    console.warn(
                        'Reverb WebSocket unavailable. Start the server with: php artisan reverb:start',
                    );
                }
            }
        });

        this.echo.connector.pusher.connection.bind('unavailable', () => {
            this.disabled = true;
        });

        return this.echo;
    }

    disconnect(): void {
        if (this.echo && ENABLE_REVERB) {
            this.echo.disconnect();
        }
        this.echo = null;
        this.connected = false;
    }

    subscribeToRHNotifications(callback: (data: any) => void): () => void {
        if (!this.isEnabled()) {
            return () => undefined;
        }

        const echo = this.connect();
        const channel = echo.channel('rh-notifications');

        channel.listen('.new-account-request', (data: any) => {
            callback(data);
        });

        return () => {
            echo.leaveChannel('rh-notifications');
        };
    }

    subscribeToPrivateRH(callback: (data: any) => void): () => void {
        if (!this.isEnabled()) {
            return () => undefined;
        }

        const echo = this.connect();
        const channel = echo.private('rh.notifications');

        channel.listen('.NewActivityLog', (data: any) => {
            callback(data);
        });

        return () => {
            echo.leaveChannel('rh.notifications');
        };
    }

    subscribeToChannel(
        channelName: string,
        eventName: string,
        callback: (data: any) => void,
        isPrivate = false,
    ): () => void {
        if (!this.isEnabled()) {
            return () => undefined;
        }

        const echo = this.connect();
        const channel = isPrivate ? echo.private(channelName) : echo.channel(channelName);
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
