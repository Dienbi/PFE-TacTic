import { useMemo } from 'react';
import { mapRole } from '../store/authSlice';
import { useAppSelector } from '../store';

export const useAuth = () => {
    const { token, user, hydrated } = useAppSelector((state) => state.auth);

    const mappedRole = useMemo(
        () => (user?.role ? mapRole(user.role) : null),
        [user?.role],
    );

    const displayName = user ? `${user.prenom} ${user.nom}` : 'User';

    return {
        token,
        user,
        hydrated,
        mappedRole,
        displayName,
        isAuthenticated: Boolean(token && user),
    };
};
