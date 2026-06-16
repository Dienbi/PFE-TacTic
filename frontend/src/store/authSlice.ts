import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AuthUser {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    role: string;
    matricule?: string;
}

interface AuthState {
    token: string | null;
    user: AuthUser | null;
    hydrated: boolean;
}

const initialState: AuthState = {
    token: null,
    user: null,
    hydrated: false,
};

export const mapRole = (dbRole: string): string => {
    const role = dbRole.toUpperCase();
    switch (role) {
        case 'CHEF_EQUIPE':
        case 'MANAGER':
            return 'manager';
        case 'EMPLOYE':
        case 'EMPLOYEE':
            return 'employee';
        case 'RH':
        default:
            return 'rh';
    }
};

export const getDefaultDashboard = (role: string): string => {
    const mappedRole = mapRole(role);
    switch (mappedRole) {
        case 'manager':
            return '/dashboard/manager';
        case 'employee':
            return '/dashboard/employee';
        case 'rh':
        default:
            return '/dashboard/rh';
    }
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        login(state, action: PayloadAction<{ token: string; user: AuthUser }>) {
            state.token = action.payload.token;
            state.user = action.payload.user;
            state.hydrated = true;
            localStorage.setItem('token', action.payload.token);
            localStorage.setItem('user', JSON.stringify(action.payload.user));
        },
        logout(state) {
            state.token = null;
            state.user = null;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        },
        hydrateFromStorage(state) {
            const token = localStorage.getItem('token');
            const rawUser = localStorage.getItem('user');
            if (token && rawUser) {
                try {
                    state.token = token;
                    state.user = JSON.parse(rawUser) as AuthUser;
                } catch {
                    state.token = null;
                    state.user = null;
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            }
            state.hydrated = true;
        },
    },
});

export const { login, logout, hydrateFromStorage } = authSlice.actions;
export default authSlice.reducer;
