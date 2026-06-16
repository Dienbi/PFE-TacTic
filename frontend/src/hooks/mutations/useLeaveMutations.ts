import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import { queryKeys } from '../../api/queryKeys';

const invalidateLeaveQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.invalidateQueries({ queryKey: ['leaves'] });
    queryClient.invalidateQueries({ queryKey: queryKeys.rhDashboard() });
};

export const useLeaveMutations = () => {
    const queryClient = useQueryClient();

    const approveLeave = useMutation({
        mutationFn: (id: number) => client.post(`/conges/${id}/approuver`),
        onSuccess: () => invalidateLeaveQueries(queryClient),
    });

    const rejectLeave = useMutation({
        mutationFn: ({ id, motif }: { id: number; motif?: string }) =>
            client.post(`/conges/${id}/refuser`, { motif }),
        onSuccess: () => invalidateLeaveQueries(queryClient),
    });

    return { approveLeave, rejectLeave };
};
