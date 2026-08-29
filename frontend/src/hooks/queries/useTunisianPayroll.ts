import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import { queryKeys } from '../../api/queryKeys';
import {
  fiscalRulesApi,
  payslipsApi,
  paymentsApi,
  correctionsApi,
  regularizationApi,
  ruleImportApi,
  auditLogsApi,
  legacyPayrollApi,
  type CorrectionHistory,
  type GlobalStats,
} from '../../api/payrollApi';

// ── Fiscal Rules Queries ───────────────────────────────────────────

export const useFiscalRules = () =>
  useQuery({
    queryKey: queryKeys.payroll.fiscalRules.all(),
    queryFn: async () => {
      const response = await fiscalRulesApi.getAll();
      return response.data.rule_sets;
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

export const useActiveFiscalRule = (date: string) =>
  useQuery({
    queryKey: queryKeys.payroll.fiscalRules.active(date),
    queryFn: async () => {
      const response = await fiscalRulesApi.getActive(date);
      return response.data;
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

export const useFiscalRuleById = (id: string) =>
  useQuery({
    queryKey: queryKeys.payroll.fiscalRules.byId(id),
    queryFn: async () => {
      const response = await fiscalRulesApi.getById(id);
      return response.data;
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    enabled: !!id,
  });

// ── Payslip Queries ───────────────────────────────────────────────

export const usePayslipById = (id: string) =>
  useQuery({
    queryKey: queryKeys.payroll.payslips.byId(id),
    queryFn: async () => {
      const response = await payslipsApi.getById(id);
      return response.data;
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    enabled: !!id,
  });

export const useAllPayslips = (params?: {
  employee_id?: string;
  status?: 'draft' | 'validated' | 'locked';
  date_from?: string;
  date_to?: string;
  search?: string;
}) =>
  useQuery({
    queryKey: queryKeys.payroll.payslips.all(params),
    queryFn: async () => {
      const response = await payslipsApi.getAll(params);
      return response.data.payslips || [];
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

export const usePayslipsByEmployee = (employeeId: string) =>
  useQuery({
    queryKey: queryKeys.payroll.payslips.byEmployee(employeeId),
    queryFn: async () => {
      const response = await payslipsApi.getByEmployee(employeeId);
      return response.data.payslips || [];
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    enabled: !!employeeId,
  });

export const usePayslipsByPeriod = (periodStart: string, periodEnd: string) =>
  useQuery({
    queryKey: queryKeys.payroll.payslips.byPeriod(periodStart, periodEnd),
    queryFn: async () => {
      const response = await payslipsApi.getByPeriod(periodStart, periodEnd);
      return response.data.payslips || [];
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    enabled: !!periodStart && !!periodEnd,
  });

// ── Payment Queries ───────────────────────────────────────────────

export const usePaymentById = (id: string) =>
  useQuery({
    queryKey: queryKeys.payroll.payments.byId(id),
    queryFn: async () => {
      const response = await paymentsApi.getById(id);
      return response.data;
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    enabled: !!id,
  });

export const usePaymentsByPayslip = (payslipId: string) =>
  useQuery({
    queryKey: queryKeys.payroll.payments.byPayslip(payslipId),
    queryFn: async () => {
      const response = await paymentsApi.getByPayslip(payslipId);
      return response.data;
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    enabled: !!payslipId,
  });

export const useAllPayments = (params?: {
  employee_id?: string;
  date_from?: string;
  date_to?: string;
}) =>
  useQuery({
    queryKey: queryKeys.payroll.payments.all(params),
    queryFn: async () => {
      const response = await paymentsApi.getAll(params);
      return response.data.payments || [];
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

export const usePaymentsByEmployee = (employeeId: string) =>
  useQuery({
    queryKey: queryKeys.payroll.payments.byEmployee(employeeId),
    queryFn: async () => {
      const response = await paymentsApi.getByEmployee(employeeId);
      return response.data;
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    enabled: !!employeeId,
  });

export const usePaymentStatistics = (params?: {
  employee_id?: string;
  date_from?: string;
  date_to?: string;
  method?: 'bank_transfer' | 'cash' | 'check';
}) =>
  useQuery({
    queryKey: queryKeys.payroll.payments.statistics(params),
    queryFn: async () => {
      const response = await paymentsApi.getStatistics(params);
      return response.data;
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

// ── Correction Queries ─────────────────────────────────────────────

export const useCorrectionHistory = (payslipId: string) =>
  useQuery({
    queryKey: queryKeys.payroll.corrections.history(payslipId),
    queryFn: async () => {
      const response = await correctionsApi.getHistory(payslipId);
      return response.data;
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    enabled: !!payslipId,
  });

// ── Regularization Queries ─────────────────────────────────────────

export const useRegularizationSummary = (employeeId: string, year: number) =>
  useQuery({
    queryKey: queryKeys.payroll.regularization.summary(employeeId, year),
    queryFn: async () => {
      const response = await regularizationApi.getYearlySummary(employeeId, year);
      return response.data;
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    enabled: !!employeeId && !!year,
  });

export const useEmployeesWithRegularizations = (year: number, search?: string) =>
  useQuery({
    queryKey: queryKeys.payroll.regularization.employees(year, search),
    queryFn: async () => {
      const response = await regularizationApi.getEmployeesWithRegularizations(year, search);
      return response.data;
    },
    staleTime: 2 * 60_000,
    gcTime: 5 * 60_000,
    enabled: !!year,
  });

// ── Rule Import Queries ───────────────────────────────────────────

export const usePendingRuleImports = () =>
  useQuery({
    queryKey: queryKeys.payroll.ruleImport.pending(),
    queryFn: async () => {
      const response = await ruleImportApi.getPending();
      return response.data.imports || [];
    },
    staleTime: 2 * 60_000,
    gcTime: 5 * 60_000,
  });

export const useRuleImportHistory = () =>
  useQuery({
    queryKey: queryKeys.payroll.ruleImport.history(),
    queryFn: async () => {
      const response = await ruleImportApi.getHistory();
      return response.data.imports || [];
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

export const useRuleImportById = (id: string) =>
  useQuery({
    queryKey: queryKeys.payroll.ruleImport.byId(id),
    queryFn: async () => {
      const response = await ruleImportApi.getById(id);
      return response.data.import_log;
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    enabled: !!id,
  });

// ── Audit Log Queries ─────────────────────────────────────────────

export const useAuditLogs = (params?: {
  action?: string;
  entity_type?: string;
  actor_id?: string;
  date_from?: string;
  date_to?: string;
}) =>
  useQuery({
    queryKey: queryKeys.payroll.auditLogs.all(params),
    queryFn: async () => {
      const response = await auditLogsApi.getAllLogs(params);
      return response.data.logs;
    },
    staleTime: 2 * 60_000,
    gcTime: 5 * 60_000,
  });

export const useAuditStatistics = (params?: {
  date_from?: string;
  date_to?: string;
}) =>
  useQuery({
    queryKey: queryKeys.payroll.auditLogs.statistics(params),
    queryFn: async () => {
      const response = await auditLogsApi.getStatistics(params);
      return response.data.statistics;
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

// ── Audit Log Queries ────────────────────────────────────────────

export const useAuditTrail = (entityType: string, entityId: string) =>
  useQuery({
    queryKey: queryKeys.payroll.auditLogs.trail(entityType, entityId),
    queryFn: async () => {
      const response = await auditLogsApi.getAuditTrail(entityType, entityId);
      return response.data;
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    enabled: !!entityType && !!entityId,
  });

// ── Legacy Payroll Global Stats ─────────────────────────────────────

export const usePayrollGlobalStats = () =>
  useQuery({
    queryKey: ['payroll', 'global-stats'],
    queryFn: async () => {
      const response = await legacyPayrollApi.getGlobalStats();
      return response.data;
    },
    staleTime: 2 * 60_000,
    gcTime: 5 * 60_000,
  });

export const useActionLogs = (action: string) =>
  useQuery({
    queryKey: queryKeys.payroll.auditLogs.action(action),
    queryFn: async () => {
      const response = await auditLogsApi.getActionLogs(action);
      return response.data;
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    enabled: !!action,
  });

export const useActorLogs = (actorId: string) =>
  useQuery({
    queryKey: queryKeys.payroll.auditLogs.actor(actorId),
    queryFn: async () => {
      const response = await auditLogsApi.getActorLogs(actorId);
      return response.data;
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    enabled: !!actorId,
  });

export const useAllAuditLogs = (params?: {
  action?: string;
  entity_type?: string;
  actor_id?: string;
  date_from?: string;
  date_to?: string;
}) =>
  useQuery({
    queryKey: queryKeys.payroll.auditLogs.all(params),
    queryFn: async () => {
      const response = await auditLogsApi.getAllLogs(params);
      return response.data.logs;
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

export const useAuditLogStatistics = (params?: {
  date_from?: string;
  date_to?: string;
}) =>
  useQuery({
    queryKey: queryKeys.payroll.auditLogs.statistics(params),
    queryFn: async () => {
      const response = await auditLogsApi.getStatistics(params);
      return response.data.statistics;
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
