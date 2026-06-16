export const queryKeys = {
    rhDashboard: (params?: unknown) => ['dashboard', 'rh', params] as const,
    employees: () => ['employees'] as const,
    employeesArchived: () => ['employees', 'archived'] as const,
    teams: () => ['teams'] as const,
    leaves: {
        all: () => ['leaves'] as const,
        pending: () => ['leaves', 'pending'] as const,
        mine: () => ['leaves', 'mine'] as const,
    },
    payroll: {
        globalStats: () => ['payroll', 'global-stats'] as const,
        employeesConfig: () => ['payroll', 'employees-config'] as const,
        records: () => ['payroll', 'records'] as const,
        mine: () => ['payroll', 'mine'] as const,
        stats: () => ['payroll', 'stats'] as const,
        team: () => ['payroll', 'team'] as const,
    },
    attendance: {
        today: () => ['attendance', 'today'] as const,
        stats: () => ['attendance', 'stats'] as const,
    },
    jobMatching: {
        applications: (postId: number) => ['job-matching', 'applications', postId] as const,
        aiRecommendations: (postId: number) => ['job-matching', 'ai', postId] as const,
    },
    aiReports: (params?: unknown) => ['reports', 'ai', params] as const,
};
