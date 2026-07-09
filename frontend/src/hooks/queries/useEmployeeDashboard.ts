import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import { queryKeys } from '../../api/queryKeys';

interface EmployeeDashboardData {
    today_attendance: {
        id: number;
        utilisateur_id: number;
        date: string;
        heure_entree: string | null;
        heure_sortie: string | null;
        duree_travail: number;
    } | null;
    monthly_stats: {
        total_days: number;
        total_hours: number;
    };
    recent_leaves: Array<{
        id: number;
        type: string;
        date_debut: string;
        date_fin: string;
        statut: string;
    }>;
    latest_payslip: {
        id: number;
        periode_debut: string;
        periode_fin: string;
        salaire_brut: number;
        deductions: number;
        salaire_net: number;
    } | null;
}

export const useEmployeeDashboard = () =>
    useQuery({
        queryKey: queryKeys.dashboard.employee(),
        queryFn: async () => {
            const response = await client.get('/dashboard/employee');
            return response.data as EmployeeDashboardData;
        },
        staleTime: 30 * 1000, // 30 seconds for attendance
    });
