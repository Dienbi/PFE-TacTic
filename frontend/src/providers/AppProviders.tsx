import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { store } from '../store';
import { hydrateFromStorage } from '../store/authSlice';
import { queryClient } from '../api/queryClient';
import { ToastProvider } from '../shared/components/Toast';
import RealtimeNotifier from './RealtimeNotifier';

interface AppProvidersProps {
    children: React.ReactNode;
}

const AuthHydrator: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    useEffect(() => {
        store.dispatch(hydrateFromStorage());
    }, []);

    return <>{children}</>;
};

const AppProviders: React.FC<AppProvidersProps> = ({ children }) => (
    <Provider store={store}>
        <QueryClientProvider client={queryClient}>
            <ToastProvider>
                <AuthHydrator>
                    <RealtimeNotifier />
                    {children}
                </AuthHydrator>
            </ToastProvider>
        </QueryClientProvider>
    </Provider>
);

export default AppProviders;
