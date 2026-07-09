import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import {
    getStats,
    getTodayPointage,
} from '../../attendance/api/attendanceApi';
import { queryKeys } from '../../api/queryKeys';

export const useTodayPointage = () =>
    useQuery({
        queryKey: queryKeys.attendance.today(),
        queryFn: () => getTodayPointage(),
        staleTime: 5 * 60_000, // 5 minutes
        gcTime: 10 * 60_000, // 10 minutes
    });

export const usePointageStats = () =>
    useQuery({
        queryKey: queryKeys.attendance.stats(),
        queryFn: () => getStats(),
        staleTime: 5 * 60_000, // 5 minutes
        gcTime: 10 * 60_000, // 10 minutes
    });

interface AttendanceSummary {
    date: string;
    stats: {
        total_employees: number;
        present_count: number;
        late_count: number;
        absent_count: number;
        currently_in_count: number;
    };
    lists: {
        present: any[];
        late: any[];
        absent: any[];
        currently_in: any[];
    };
}

export interface AttendanceAnomaly {
    id: number;
    nom: string;
    prenom: string;
    matricule: string;
    role: string;
    role_label: string;
    absence_count: number;
    unjustified_absence_count: number;
    late_count: number;
    present_count: number;
    flags: Array<"frequent_late" | "heavy_absence">;
    severity: "high" | "medium";
}

interface AnomalyResponse {
    period: {
        start_date: string;
        end_date: string;
        working_days: number;
        days: number;
    };
    total: number;
    anomalies: AttendanceAnomaly[];
}

export const useAttendanceSummary = (date: string) =>
    useQuery({
        queryKey: queryKeys.attendance.summary(date),
        queryFn: async () => {
            const response = await client.get(`/pointages/summary?date=${date}`);
            return response.data as AttendanceSummary;
        },
        staleTime: 2 * 60_000, // 2 minutes - backend caches for 5 min
        gcTime: 5 * 60_000, // 5 minutes
    });

export const useAttendanceAnomalies = (endDate: string, days: number = 30) =>
    useQuery({
        queryKey: queryKeys.attendance.anomalies(endDate, days),
        queryFn: async () => {
            const response = await client.get(`/pointages/anomalies?end_date=${endDate}&days=${days}`);
            return response.data as AnomalyResponse;
        },
        staleTime: 5 * 60_000, // 5 minutes - backend caches for 10 min
        gcTime: 10 * 60_000, // 10 minutes
    });
