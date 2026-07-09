import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import { queryKeys } from '../../api/queryKeys';

interface ManagerDashboardData {
    team: {
        id: number;
        nom: string;
        chef_id: number;
    } | null;
    team_size: number;
    available: number;
    on_leave: number;
    alerts: number;
    pending_leaves: Array<{
        id: number;
        type: string;
        date_debut: string;
        date_fin: string;
        nom: string;
        prenom: string;
    }>;
}

export const useManagerDashboard = () =>
    useQuery({
        queryKey: queryKeys.dashboard.manager(),
        queryFn: async () => {
            const response = await client.get('/dashboard/manager');
            return response.data as ManagerDashboardData;
        },
        staleTime: 60 * 1000, // 1 minute
    });
