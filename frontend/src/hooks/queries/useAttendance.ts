import { useQuery } from '@tanstack/react-query';
import {
    getStats,
    getTodayPointage,
} from '../../attendance/api/attendanceApi';
import { queryKeys } from '../../api/queryKeys';

export const useTodayPointage = () =>
    useQuery({
        queryKey: queryKeys.attendance.today(),
        queryFn: () => getTodayPointage(),
    });

export const usePointageStats = () =>
    useQuery({
        queryKey: queryKeys.attendance.stats(),
        queryFn: () => getStats(),
    });
