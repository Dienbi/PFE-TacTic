import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import { queryKeys } from '../../api/queryKeys';

export interface RhDashboardParams {
    months?: number;
    attendance_limit?: number;
    performance_limit?: number;
    recent_leaves_limit?: number;
    with_ai?: number;
}

const DEFAULT_PARAMS: RhDashboardParams = {
    months: 6,
    attendance_limit: 10,
    performance_limit: 10,
    recent_leaves_limit: 5,
    with_ai: 1,
};

export const useRhDashboard = (params: RhDashboardParams = DEFAULT_PARAMS) =>
    useQuery({
        queryKey: queryKeys.rhDashboard(params),
        queryFn: async () => {
            const search = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) {
                    search.set(key, String(value));
                }
            });
            const response = await client.get(`/dashboard/all?${search.toString()}`);
            return response.data;
        },
    });
