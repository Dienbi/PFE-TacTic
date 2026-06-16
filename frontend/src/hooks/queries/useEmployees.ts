import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import { queryKeys } from '../../api/queryKeys';

export const useEmployees = (enabled = true) =>
    useQuery({
        queryKey: queryKeys.employees(),
        queryFn: async () => {
            const response = await client.get('/utilisateurs');
            return response.data;
        },
        enabled,
    });

export const useEmployeesPage = (page: number, perPage: number) =>
    useQuery({
        queryKey: [...queryKeys.employees(), page, perPage],
        queryFn: async () => {
            const response = await client.get(
                `/utilisateurs?per_page=${perPage}&page=${page}`,
            );
            return response.data;
        },
    });

export const useArchivedEmployees = (enabled = false) =>
    useQuery({
        queryKey: queryKeys.employeesArchived(),
        queryFn: async () => {
            const response = await client.get('/utilisateurs/archived');
            return response.data;
        },
        enabled,
    });

export const useTeams = () =>
    useQuery({
        queryKey: queryKeys.teams(),
        queryFn: async () => {
            const response = await client.get('/equipes');
            return response.data;
        },
    });
