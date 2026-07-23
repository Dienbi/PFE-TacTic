export const queryKeys = {
    rhDashboard: (params?: unknown) => ['dashboard', 'rh', params] as const,
    dashboard: {
        manager: () => ['dashboard', 'manager'] as const,
        employee: () => ['dashboard', 'employee'] as const,
    },
    employees: () => ['employees'] as const,
    employeesArchived: () => ['employees', 'archived'] as const,
    teams: () => ['teams'] as const,
    leaves: {
        all: () => ['leaves'] as const,
        pending: () => ['leaves', 'pending'] as const,
        mine: () => ['leaves', 'mine'] as const,
    },
    attendance: {
        today: () => ['attendance', 'today'] as const,
        stats: () => ['attendance', 'stats'] as const,
        summary: (date: string) => ['attendance', 'summary', date] as const,
        anomalies: (endDate: string, days: number) => ['attendance', 'anomalies', endDate, days] as const,
    },
    jobMatching: {
        applications: (postId: number) => ['job-matching', 'applications', postId] as const,
        aiRecommendations: (postId: number) => ['job-matching', 'ai', postId] as const,
    },
    aiReports: (params?: unknown) => ['reports', 'ai', params] as const,
    payroll: {
        fiscalRules: {
            all: () => ['payroll', 'fiscal-rules'] as const,
            active: (date: string) => ['payroll', 'fiscal-rules', 'active', date] as const,
            byId: (id: string) => ['payroll', 'fiscal-rules', id] as const,
        },
        payslips: {
            all: (params?: unknown) => ['payroll', 'payslips', 'all', params] as const,
            byId: (id: string) => ['payroll', 'payslips', id] as const,
            byEmployee: (employeeId: string) => ['payroll', 'payslips', 'employee', employeeId] as const,
            byPeriod: (start: string, end: string) => ['payroll', 'payslips', 'period', start, end] as const,
        },
        payments: {
            all: (params?: unknown) => ['payroll', 'payments', 'all', params] as const,
            byId: (id: string) => ['payroll', 'payments', id] as const,
            byPayslip: (payslipId: string) => ['payroll', 'payments', 'payslip', payslipId] as const,
            byEmployee: (employeeId: string) => ['payroll', 'payments', 'employee', employeeId] as const,
            statistics: (params?: unknown) => ['payroll', 'payments', 'statistics', params] as const,
        },
        corrections: {
            history: (payslipId: string) => ['payroll', 'corrections', 'history', payslipId] as const,
        },
        regularization: {
            summary: (employeeId: string, year: number) => ['payroll', 'regularization', 'summary', employeeId, year] as const,
            employees: (year: number, search?: string) => ['payroll', 'regularization', 'employees', year, search] as const,
        },
        ruleImport: {
            pending: () => ['payroll', 'rule-import', 'pending'] as const,
            history: () => ['payroll', 'rule-import', 'history'] as const,
            byId: (id: string) => ['payroll', 'rule-import', id] as const,
        },
        auditLogs: {
            trail: (entityType: string, entityId: string) => ['payroll', 'audit', 'trail', entityType, entityId] as const,
            action: (action: string) => ['payroll', 'audit', 'action', action] as const,
            actor: (actorId: string) => ['payroll', 'audit', 'actor', actorId] as const,
            all: (params?: unknown) => ['payroll', 'audit', 'all', params] as const,
            statistics: (params?: unknown) => ['payroll', 'audit', 'statistics', params] as const,
        },
    },
};
