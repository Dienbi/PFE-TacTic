import { useQuery } from '@tanstack/react-query';
import { jobMatchingApi } from '../../jobmatching/api/jobMatchingApi';

export const useJobPosts = () =>
    useQuery({
        queryKey: ['job-posts', 'published'],
        queryFn: () => jobMatchingApi.getPublishedJobPosts(),
        staleTime: 5 * 60_000, // 5 minutes
        gcTime: 10 * 60_000, // 10 minutes
    });

export const useJobRequests = () =>
    useQuery({
        queryKey: ['job-requests', 'mine'],
        queryFn: () => jobMatchingApi.getJobRequests(),
        staleTime: 5 * 60_000, // 5 minutes
        gcTime: 10 * 60_000, // 10 minutes
    });

export const useMyApplications = () =>
    useQuery({
        queryKey: ['applications', 'mine'],
        queryFn: () => jobMatchingApi.getMyApplications(),
        staleTime: 10 * 60_000, // 10 minutes
        gcTime: 30 * 60_000, // 30 minutes
        refetchOnMount: false,
        refetchOnWindowFocus: false,
    });
