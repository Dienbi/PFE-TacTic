import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../api/queryKeys';
import {
  fiscalRulesApi,
  payslipsApi,
  paymentsApi,
  correctionsApi,
  regularizationApi,
  ruleImportApi,
  auditLogsApi,
} from '../../api/payrollApi';

const invalidatePayrollQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ['payroll'] });
};

// ── Fiscal Rules Mutations ─────────────────────────────────────────

export const useFiscalRulesMutations = () => {
  const queryClient = useQueryClient();

  const createDraft = useMutation({
    mutationFn: (data: {
      year: number;
      effective_from: string;
      effective_to?: string;
      cnss_employee_rate: number;
      cnss_employer_rate: number;
      cnss_monthly_ceiling?: number;
      css_rate: number;
      css_exempt_annual_net_threshold: number;
      prof_expense_rate: number;
      prof_expense_annual_cap: number;
      min_annual_tax: number;
      source_pdf_ref?: string;
    }) => fiscalRulesApi.createDraft(data),
    onSuccess: () => invalidatePayrollQueries(queryClient),
  });

  const updateDraft = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => fiscalRulesApi.updateDraft(id, data),
    onSuccess: () => invalidatePayrollQueries(queryClient),
  });

  const confirm = useMutation({
    mutationFn: (id: string) => fiscalRulesApi.confirm(id),
    onSuccess: () => invalidatePayrollQueries(queryClient),
  });

  const supersede = useMutation({
    mutationFn: (id: string) => fiscalRulesApi.supersede(id),
    onSuccess: () => invalidatePayrollQueries(queryClient),
  });

  const deleteDraft = useMutation({
    mutationFn: (id: string) => fiscalRulesApi.deleteDraft(id),
    onSuccess: () => invalidatePayrollQueries(queryClient),
  });

  const addIrppBracket = useMutation({
    mutationFn: ({ ruleSetId, data }: { ruleSetId: string; data: any }) => 
      fiscalRulesApi.addIrppBracket(ruleSetId, data),
    onSuccess: () => invalidatePayrollQueries(queryClient),
  });

  const updateIrppBracket = useMutation({
    mutationFn: ({ bracketId, data }: { bracketId: string; data: any }) => 
      fiscalRulesApi.updateIrppBracket(bracketId, data),
    onSuccess: () => invalidatePayrollQueries(queryClient),
  });

  const deleteIrppBracket = useMutation({
    mutationFn: (bracketId: string) => fiscalRulesApi.deleteIrppBracket(bracketId),
    onSuccess: () => invalidatePayrollQueries(queryClient),
  });

  const addFamilyDeduction = useMutation({
    mutationFn: ({ ruleSetId, data }: { ruleSetId: string; data: any }) => 
      fiscalRulesApi.addFamilyDeduction(ruleSetId, data),
    onSuccess: () => invalidatePayrollQueries(queryClient),
  });

  const updateFamilyDeduction = useMutation({
    mutationFn: ({ deductionId, data }: { deductionId: string; data: any }) => 
      fiscalRulesApi.updateFamilyDeduction(deductionId, data),
    onSuccess: () => invalidatePayrollQueries(queryClient),
  });

  const deleteFamilyDeduction = useMutation({
    mutationFn: (deductionId: string) => fiscalRulesApi.deleteFamilyDeduction(deductionId),
    onSuccess: () => invalidatePayrollQueries(queryClient),
  });

  return {
    createDraft,
    updateDraft,
    confirm,
    supersede,
    deleteDraft,
    addIrppBracket,
    updateIrppBracket,
    deleteIrppBracket,
    addFamilyDeduction,
    updateFamilyDeduction,
    deleteFamilyDeduction,
  };
};

// ── Payslip Mutations ───────────────────────────────────────────────

export const usePayslipMutations = () => {
  const queryClient = useQueryClient();

  const generateSingle = useMutation({
    mutationFn: (data: any) => payslipsApi.generateSingle(data),
    onSuccess: () => invalidatePayrollQueries(queryClient),
  });

  const generateBatch = useMutation({
    mutationFn: (data: any) => payslipsApi.generateBatch(data),
    onSuccess: () => invalidatePayrollQueries(queryClient),
  });

  const validate = useMutation({
    mutationFn: (id: string) => payslipsApi.validate(id),
    onSuccess: () => invalidatePayrollQueries(queryClient),
  });

  const lock = useMutation({
    mutationFn: (id: string) => payslipsApi.lock(id),
    onSuccess: () => invalidatePayrollQueries(queryClient),
  });

  const deleteDraft = useMutation({
    mutationFn: (id: string) => payslipsApi.deleteDraft(id),
    onSuccess: () => invalidatePayrollQueries(queryClient),
  });

  return {
    generateSingle,
    generateBatch,
    validate,
    lock,
    deleteDraft,
  };
};

// ── Payment Mutations ───────────────────────────────────────────────

export const usePaymentMutations = () => {
  const queryClient = useQueryClient();

  const record = useMutation({
    mutationFn: (data: any) => paymentsApi.record(data),
    onSuccess: () => invalidatePayrollQueries(queryClient),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => paymentsApi.update(id, data),
    onSuccess: () => invalidatePayrollQueries(queryClient),
  });

  const deletePayment = useMutation({
    mutationFn: (id: string) => paymentsApi.delete(id),
    onSuccess: () => invalidatePayrollQueries(queryClient),
  });

  return {
    record,
    update,
    deletePayment,
  };
};

// ── Correction Mutations ───────────────────────────────────────────

export const useCorrectionMutations = () => {
  const queryClient = useQueryClient();

  const createCorrection = useMutation({
    mutationFn: ({ originalPayslipId, data }: { originalPayslipId: string; data: any }) => 
      correctionsApi.createCorrection(originalPayslipId, data),
    onSuccess: () => invalidatePayrollQueries(queryClient),
  });

  const revert = useMutation({
    mutationFn: ({ currentPayslipId, targetVersionId }: { currentPayslipId: string; targetVersionId: string }) => 
      correctionsApi.revert(currentPayslipId, targetVersionId),
    onSuccess: () => invalidatePayrollQueries(queryClient),
  });

  const compareVersions = useMutation({
    mutationFn: ({ payslipId1, payslipId2 }: { payslipId1: string; payslipId2: string }) => 
      correctionsApi.compare(payslipId1, payslipId2),
  });

  return {
    createCorrection,
    revert,
    compareVersions,
  };
};

// ── Regularization Mutations ───────────────────────────────────────

export const useRegularizationMutations = () => {
  const queryClient = useQueryClient();

  const calculateRegularization = useMutation({
    mutationFn: ({ employeeId, year }: { employeeId: string; year: number }) => 
      regularizationApi.calculateRegularization(employeeId, year),
    onSuccess: () => invalidatePayrollQueries(queryClient),
  });

  const createRegularizationPayslip = useMutation({
    mutationFn: ({ employeeId, year }: { employeeId: string; year: number }) => 
      regularizationApi.createRegularizationPayslip(employeeId, year),
    onSuccess: () => invalidatePayrollQueries(queryClient),
  });

  const batchCalculate = useMutation({
    mutationFn: (year: number) => regularizationApi.batchCalculate(year),
    onSuccess: () => invalidatePayrollQueries(queryClient),
  });

  return {
    calculateRegularization,
    createRegularizationPayslip,
    batchCalculate,
  };
};

// ── Rule Import Mutations ───────────────────────────────────────────

export const useRuleImportMutations = () => {
  const queryClient = useQueryClient();

  const uploadPdf = useMutation({
    mutationFn: (formData: FormData) => ruleImportApi.uploadPdf(formData),
    onSuccess: () => invalidatePayrollQueries(queryClient),
  });

  const reviewAndConfirm = useMutation({
    mutationFn: ({ importLogId, reviewDecisions }: { importLogId: string; reviewDecisions: any }) => 
      ruleImportApi.reviewAndConfirm(importLogId, reviewDecisions),
    onSuccess: () => invalidatePayrollQueries(queryClient),
  });

  const reject = useMutation({
    mutationFn: ({ importLogId, reason }: { importLogId: string; reason: string }) => 
      ruleImportApi.reject(importLogId, reason),
    onSuccess: () => invalidatePayrollQueries(queryClient),
  });

  return {
    uploadPdf,
    reviewAndConfirm,
    reject,
  };
};

// ── Audit Log Mutations ───────────────────────────────────────────

export const useAuditLogMutations = () => {
  const queryClient = useQueryClient();

  const logAction = useMutation({
    mutationFn: (data: any) => auditLogsApi.logAction(data),
    onSuccess: () => invalidatePayrollQueries(queryClient),
  });

  return {
    logAction,
  };
};
