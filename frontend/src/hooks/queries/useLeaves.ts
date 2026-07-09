import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import { queryKeys } from '../../api/queryKeys';

export const useMesConges = () =>
    useQuery({
        queryKey: queryKeys.leaves.mine(),
        queryFn: async () => {
            const response = await client.get('/conges/mes-conges');
            return response.data;
        },
        staleTime: 5 * 60_000, // 5 minutes
        gcTime: 10 * 60_000, // 10 minutes
    });

const normalizeList = <T,>(payload: T[] | { data?: T[] }): T[] => {
    if (Array.isArray(payload)) return payload;
    return payload?.data ?? [];
};

export const useAllLeaves = () =>
    useQuery({
        queryKey: queryKeys.leaves.all(),
        queryFn: async () => {
            const response = await client.get('/conges');
            return normalizeList(response.data);
        },
        staleTime: 5 * 60_000, // 5 minutes
        gcTime: 10 * 60_000, // 10 minutes
    });

export const usePendingLeaves = () =>
    useQuery({
        queryKey: queryKeys.leaves.pending(),
        queryFn: async () => {
            const response = await client.get('/conges/en-attente');
            return normalizeList(response.data);
        },
        staleTime: 5 * 60_000, // 5 minutes
        gcTime: 10 * 60_000, // 10 minutes
    });

export const useLeaveManagement = () => {
    const all = useAllLeaves();
    const pending = usePendingLeaves();

    return {
        allLeaves: all.data ?? [],
        pendingLeaves: pending.data ?? [],
        isLoading: all.isLoading || pending.isLoading,
        isError: all.isError || pending.isError,
        refetch: () => Promise.all([all.refetch(), pending.refetch()]),
    };
};
