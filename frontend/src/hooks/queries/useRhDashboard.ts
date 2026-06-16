import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import { queryKeys } from '../../api/queryKeys';
import type { AttendanceSummary, DashboardKPIs, PerformanceResult } from '../../api/aiApi';

export interface RhDashboardParams {
    months?: number;
    attendance_limit?: number;
    performance_limit?: number;
    recent_leaves_limit?: number;
}

const DEFAULT_PARAMS: RhDashboardParams = {
    months: 6,
    attendance_limit: 10,
    performance_limit: 10,
    recent_leaves_limit: 5,
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

export interface AiReportsParams {
    attendance_limit?: number;
    performance_limit?: number;
}

export interface AiReportsData {
    ai_available: boolean;
    attendance_predictions: AttendanceSummary[];
    performance_scores: PerformanceResult[];
    ai_kpis: DashboardKPIs | Record<string, unknown>;
}

const DEFAULT_AI_PARAMS: AiReportsParams = {
    attendance_limit: 10,
    performance_limit: 10,
};

export const useAiReports = (params: AiReportsParams = DEFAULT_AI_PARAMS) =>
    useQuery({
        queryKey: queryKeys.aiReports(params),
        queryFn: async () => {
            const search = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) {
                    search.set(key, String(value));
                }
            });
            const response = await client.get(`/reports/ai?${search.toString()}`);
            return response.data as AiReportsData;
        },
        staleTime: 5 * 60 * 1000,
    });
