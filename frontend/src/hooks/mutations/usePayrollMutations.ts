import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';

const invalidatePayrollQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.invalidateQueries({ queryKey: ['payroll'] });
};

export const usePayrollMutations = () => {
    const queryClient = useQueryClient();

    const configureSalary = useMutation({
        mutationFn: (payload: { utilisateur_id: number; salaire_base: number }) =>
            client.post('/paies/configurer-salaire', payload),
        onSuccess: () => invalidatePayrollQueries(queryClient),
    });

    const increaseSalaries = useMutation({
        mutationFn: (percentage: number) =>
            client.post('/paies/increase-salaries', { percentage }),
        onSuccess: () => invalidatePayrollQueries(queryClient),
    });

    const generatePayroll = useMutation({
        mutationFn: (payload: Record<string, unknown>) =>
            client.post('/paies/generer', payload),
        onSuccess: () => invalidatePayrollQueries(queryClient),
    });

    const generateAllPayrolls = useMutation({
        mutationFn: (payload: Record<string, unknown>) =>
            client.post('/paies/generer-tous', payload),
        onSuccess: () => invalidatePayrollQueries(queryClient),
    });

    const validatePayroll = useMutation({
        mutationFn: (id: number) => client.post(`/paies/${id}/valider`),
        onSuccess: () => invalidatePayrollQueries(queryClient),
    });

    const payPayroll = useMutation({
        mutationFn: (id: number) => client.post(`/paies/${id}/payer`),
        onSuccess: () => invalidatePayrollQueries(queryClient),
    });

    return {
        configureSalary,
        increaseSalaries,
        generatePayroll,
        generateAllPayrolls,
        validatePayroll,
        payPayroll,
    };
};
