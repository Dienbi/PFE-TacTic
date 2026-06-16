import { useQueries, useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import { queryKeys } from '../../api/queryKeys';

export const useMesPaies = () =>
    useQuery({
        queryKey: queryKeys.payroll.mine(),
        queryFn: async () => {
            const response = await client.get('/paies/mes-paies');
            return response.data;
        },
    });

export const usePayrollStats = () =>
    useQuery({
        queryKey: queryKeys.payroll.stats(),
        queryFn: async () => {
            const response = await client.get('/paies/stats');
            return response.data;
        },
    });

export const usePayrollDashboard = () => {
    const results = useQueries({
        queries: [
            {
                queryKey: queryKeys.payroll.globalStats(),
                queryFn: async () => {
                    const response = await client.get('/paies/global-stats');
                    return response.data;
                },
            },
            {
                queryKey: queryKeys.payroll.employeesConfig(),
                queryFn: async () => {
                    const response = await client.get('/paies/employees-config');
                    return response.data;
                },
            },
            {
                queryKey: queryKeys.payroll.records(),
                queryFn: async () => {
                    const response = await client.get('/paies');
                    return response.data?.data ?? response.data ?? [];
                },
            },
        ],
    });

    return {
        globalStats: results[0].data,
        employeesConfig: results[1].data ?? [],
        payrollRecords: results[2].data ?? [],
        isLoading: results.some((r) => r.isLoading),
        isError: results.some((r) => r.isError),
        refetch: () => Promise.all(results.map((r) => r.refetch())),
    };
};
