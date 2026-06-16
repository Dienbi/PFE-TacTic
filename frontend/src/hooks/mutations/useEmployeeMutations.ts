import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import { queryKeys } from '../../api/queryKeys';

const invalidateEmployeeQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    queryClient.invalidateQueries({ queryKey: queryKeys.teams() });
};

export const useEmployeeMutations = () => {
    const queryClient = useQueryClient();

    const saveEmployee = useMutation({
        mutationFn: async ({
            id,
            data,
        }: {
            id?: number;
            data: Record<string, unknown>;
        }) => {
            if (id) {
                return client.put(`/utilisateurs/${id}`, data);
            }
            return client.post('/utilisateurs', data);
        },
        onSuccess: () => invalidateEmployeeQueries(queryClient),
    });

    const archiveEmployee = useMutation({
        mutationFn: (id: number) => client.delete(`/utilisateurs/${id}`),
        onSuccess: () => invalidateEmployeeQueries(queryClient),
    });

    const restoreEmployee = useMutation({
        mutationFn: (id: number) => client.post(`/utilisateurs/${id}/restore`),
        onSuccess: () => invalidateEmployeeQueries(queryClient),
    });

    const forceDeleteEmployee = useMutation({
        mutationFn: (id: number) => client.delete(`/utilisateurs/${id}/force`),
        onSuccess: () => invalidateEmployeeQueries(queryClient),
    });

    return { saveEmployee, archiveEmployee, restoreEmployee, forceDeleteEmployee };
};
