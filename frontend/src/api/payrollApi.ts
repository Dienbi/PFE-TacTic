import client from './client';

// ── TypeScript Interfaces ───────────────────────────────────────────

// Fiscal Rule Set
export interface FiscalRuleSet {
  id: string;
  year: number;
  effective_from: string;
  effective_to: string | null;
  cnss_employee_rate: number;
  cnss_employer_rate: number;
  cnss_monthly_ceiling: number | null;
  css_rate: number;
  css_exempt_annual_net_threshold: number;
  prof_expense_rate: number;
  prof_expense_annual_cap: number;
  min_annual_tax: number;
  source_pdf_ref: string | null;
  is_confirmed: boolean;
  confirmed_by: string | null;
  confirmed_at: string | null;
  superseded_by: string | null;
  superseded_at: string | null;
  created_at: string;
  updated_at: string;
  status: string;
  irpp_brackets?: IrppBracket[];
  family_deductions?: FamilyDeductionRule[];
  brackets?: IrppBracket[];
  deductions?: FamilyDeductionRule[];
}

export interface IrppBracket {
  id: string;
  rule_set_id: string;
  bracket_order: number;
  min_annual_amount: number;
  max_annual_amount: number | null;
  rate: number;
}

export interface FamilyDeductionRule {
  id: string;
  rule_set_id: string;
  deduction_type: 'head_of_household' | 'child' | 'disabled_child' | 'student_child_non_scholarship';
  annual_amount: number;
  max_count: number | null;
}

// Payslip
export interface Payslip {
  id: string;
  employee_id: string;
  pay_period_start: string;
  pay_period_end: string;
  rule_set_id: string;
  base_salary_used: number;
  gross_salary: number;
  cnss_employee_amount: number;
  cnss_employer_amount: number;
  taxable_base_annual: number;
  irpp_annual: number;
  irpp_monthly: number;
  css_amount: number;
  net_salary: number;
  status: 'draft' | 'validated' | 'locked' | 'superseded';
  version: number;
  supersedes_payslip_id: string | null;
  is_regularization_adjustment: boolean;
  generated_at: string;
  generated_by: string;
  payslip_pay_items: PayslipPayItem[];
  employee?: {
    id: string;
    nom: string;
    prenom: string;
    matricule: string;
  };
  created_at?: string;
}

export interface PayslipPayItem {
  id: string;
  payslip_id: string;
  pay_item_id: string | null;
  name: string;
  amount: number;
  is_taxable: boolean;
  is_cnss_applicable: boolean;
}

export interface CorrectionHistory {
  versions: Payslip[];
  current_version: number;
}

// Payment
export interface Payment {
  id: string;
  payslip_id: string;
  method: 'bank_transfer' | 'cash' | 'check';
  amount: number;
  paid_at: string;
  reference: string | null;
  created_by: string;
  created_at: string;
}

// Rule Import Log
export interface RuleImportLog {
  id: string;
  rule_set_id: string | null;
  uploaded_pdf_ref: string;
  ai_raw_output_json: Record<string, unknown>;
  proposed_changes_json: Record<string, unknown>;
  reviewed_by: string | null;
  review_decisions_json: Record<string, unknown> | null;
  status: 'pending_review' | 'confirmed' | 'rejected';
  created_at: string;
  updated_at: string;
}

// Audit Log
export interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details_json: Record<string, unknown> | null;
  created_at: string;
}

// ── Fiscal Rules Management ────────────────────────────────────────

export const fiscalRulesApi = {
  getAll: () => client.get<{ rule_sets: FiscalRuleSet[] }>('/payroll/fiscal-rules'),
  getActive: (date: string) => client.get<FiscalRuleSet>(`/payroll/fiscal-rules/active?date=${date}`),
  getById: (id: string) => client.get<FiscalRuleSet>(`/payroll/fiscal-rules/${id}`),
  
  createDraft: (data: {
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
  }) => client.post<FiscalRuleSet>('/payroll/fiscal-rules', data),
  
  updateDraft: (id: string, data: Partial<{
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
  }>) => client.put<FiscalRuleSet>(`/payroll/fiscal-rules/${id}/draft`, data),
  
  confirm: (id: string) => client.post<FiscalRuleSet>(`/payroll/fiscal-rules/${id}/confirm`),
  supersede: (id: string) => client.post<FiscalRuleSet>(`/payroll/fiscal-rules/${id}/supersede`),
  deleteDraft: (id: string) => client.delete<{ message: string }>(`/payroll/fiscal-rules/${id}`),
  
  // IRPP Brackets
  addIrppBracket: (ruleSetId: string, data: {
    bracket_order: number;
    min_annual_amount: number;
    max_annual_amount?: number;
    rate: number;
  }) => client.post<IrppBracket>(`/payroll/fiscal-rules/${ruleSetId}/brackets`, data),
  
  updateIrppBracket: (bracketId: string, data: Partial<{
    bracket_order: number;
    min_annual_amount: number;
    max_annual_amount?: number;
    rate: number;
  }>) => client.put<IrppBracket>(`/payroll/fiscal-rules/brackets/${bracketId}`, data),
  
  deleteIrppBracket: (bracketId: string) => client.delete<{ message: string }>(`/payroll/fiscal-rules/brackets/${bracketId}`),
  
  // Family Deductions
  addFamilyDeduction: (ruleSetId: string, data: {
    deduction_type: 'head_of_household' | 'child' | 'disabled_child' | 'student_child_non_scholarship';
    annual_amount: number;
    max_count?: number;
  }) => client.post<FamilyDeductionRule>(`/payroll/fiscal-rules/${ruleSetId}/deductions`, data),
  
  updateFamilyDeduction: (deductionId: string, data: Partial<{
    annual_amount: number;
    max_count?: number;
  }>) => client.put<FamilyDeductionRule>(`/payroll/fiscal-rules/deductions/${deductionId}`, data),
  
  deleteFamilyDeduction: (deductionId: string) => client.delete<{ message: string }>(`/payroll/fiscal-rules/deductions/${deductionId}`),
};

// ── Payslip Generation ─────────────────────────────────────────────

export const payslipsApi = {
  getAll: (params?: {
    employee_id?: string;
    status?: 'draft' | 'validated' | 'locked';
    date_from?: string;
    date_to?: string;
    search?: string;
  }) => client.get<{ payslips: Payslip[] }>('/payroll/payslips', { params }),
  
  generateSingle: (data: {
    employee_id: string;
    pay_period_start: string;
    pay_period_end: string;
    pay_items?: Array<{
      pay_item_id?: string;
      name: string;
      amount: number;
      is_taxable?: boolean;
      is_cnss_applicable?: boolean;
    }>;
  }) => client.post<Payslip>('/payroll/payslips/single', data),
  
  generateBatch: (data: {
    employee_ids: string[];
    pay_period_start: string;
    pay_period_end: string;
    pay_items?: Array<{
      pay_item_id?: string;
      name: string;
      amount: number;
      is_taxable?: boolean;
      is_cnss_applicable?: boolean;
    }>;
  }) => client.post<{ generated: Payslip[]; failed: Array<{ employee_id: string; error: string }> }>('/payroll/payslips/batch', data),
  
  validate: (id: string) => client.post<Payslip>(`/payroll/payslips/${id}/validate`),
  lock: (id: string) => client.post<Payslip>(`/payroll/payslips/${id}/lock`),
  deleteDraft: (id: string) => client.delete<{ message: string }>(`/payroll/payslips/${id}`),
  
  getById: (id: string) => client.get<Payslip>(`/payroll/payslips/${id}`),
  getByEmployee: (employeeId: string) => client.get<{ payslips: Payslip[] }>(`/payroll/payslips/employee/${employeeId}`),
  getByPeriod: (periodStart: string, periodEnd: string) => 
    client.get<{ payslips: Payslip[] }>(`/payroll/payslips/period?period_start=${periodStart}&period_end=${periodEnd}`),
};

// ── Payment Tracking ──────────────────────────────────────────────

export const paymentsApi = {
  record: (data: {
    payslip_id: string;
    method: 'bank_transfer' | 'cash' | 'check';
    amount: number;
    paid_at: string;
    reference?: string;
  }) => client.post<Payment>('/payroll/payments', data),
  
  getAll: (params?: {
    employee_id?: string;
    date_from?: string;
    date_to?: string;
  }) => client.get<{ payments: Payment[] }>('/payroll/payments', { params }),
  
  getById: (id: string) => client.get<Payment>(`/payroll/payments/${id}`),
  getByPayslip: (payslipId: string) => client.get<Payment[]>(`/payroll/payments/payslip/${payslipId}`),
  getByEmployee: (employeeId: string) => client.get<Payment[]>(`/payroll/payments/employee/${employeeId}`),
  
  update: (id: string, data: Partial<{
    method: 'bank_transfer' | 'cash' | 'check';
    amount: number;
    paid_at: string;
    reference?: string;
  }>) => client.put<Payment>(`/payroll/payments/${id}`, data),
  
  delete: (id: string) => client.delete<{ message: string }>(`/payroll/payments/${id}`),
  
  getStatistics: (params?: {
    employee_id?: string;
    date_from?: string;
    date_to?: string;
    method?: 'bank_transfer' | 'cash' | 'check';
  }) => client.get<{
    total_paid: number;
    total_pending: number;
    payment_count: number;
    by_method: Record<string, number>;
  }>('/payroll/payments/statistics', { params }),
};

// ── Payslip Corrections ───────────────────────────────────────────

export const correctionsApi = {
  createCorrection: (originalPayslipId: string, data: {
    reason: string;
    base_salary?: number;
    pay_items?: Array<{
      pay_item_id?: string;
      name: string;
      amount: number;
      is_taxable?: boolean;
      is_cnss_applicable?: boolean;
    }>;
    is_regularization?: boolean;
  }) => client.post<{
    success: boolean;
    message?: string;
    payslip?: Payslip;
  }>(`/payroll/corrections/${originalPayslipId}`, data),
  
  getHistory: (payslipId: string) => client.get<CorrectionHistory>(`/payroll/corrections/history/${payslipId}`),
  compare: (payslipId1: string, payslipId2: string) => 
    client.post<{ payslip1: Payslip; payslip2: Payslip; differences: Record<string, unknown> }>('/payroll/corrections/compare', {
      payslip_id_1: payslipId1,
      payslip_id_2: payslipId2,
    }),
  
  revert: (currentPayslipId: string, targetVersionId: string) => 
    client.post<{
      success: boolean;
      message?: string;
      restored_payslip?: Payslip;
    }>(`/payroll/corrections/${currentPayslipId}/revert`, { target_version_id: targetVersionId }),
};

// ── Year-End Regularization ───────────────────────────────────────

export const regularizationApi = {
  calculateRegularization: (employeeId: string, year: number) => 
    client.post<{
      employee_id: string;
      year: number;
      total_annual_tax_paid: number;
      actual_annual_tax: number;
      regularization_amount: number;
      regularization_type: 'refund' | 'additional';
    }>(`/payroll/regularization/calculate/${employeeId}`, { year }),
  
  createRegularizationPayslip: (employeeId: string, year: number) => 
    client.post<{
      success: boolean;
      message?: string;
      regularization_amount?: number;
      payslip?: Payslip;
    }>(`/payroll/regularization/create/${employeeId}`, { year }),
  
  batchCalculate: (year: number) => 
    client.post<{
      calculated: Array<{
        employee_id: string;
        regularization_amount: number;
        regularization_type: 'refund' | 'additional';
      }>;
      failed: Array<{ employee_id: string; error: string }>;
    }>('/payroll/regularization/batch-calculate', { year }),
  
  getYearlySummary: (employeeId: string, year: number) => 
    client.get<{
      employee_id: string;
      year: number;
      total_gross_salary: number;
      total_cnss_paid: number;
      total_irpp_paid: number;
      total_css_paid: number;
      total_net_salary: number;
      payslip_count: number;
      regularization_amount: number;
    }>(`/payroll/regularization/summary/${employeeId}`, { params: { year } }),

  getEmployeesWithRegularizations: (year: number, search?: string) =>
    client.get<{
      employees: Array<{
        id: string;
        matricule: string;
        nom: string;
        prenom: string;
        payslip_count: number;
        total_net_salary: number;
        has_regularization: boolean;
      }>;
      total_count: number;
    }>('/payroll/regularization/employees', { params: { year, search } }),
};

// ── Rule Import ────────────────────────────────────────────────────

export const ruleImportApi = {
  uploadPdf: (formData: FormData) => client.post<RuleImportLog>('/payroll/rule-import/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  
  reviewAndConfirm: (importLogId: string, reviewDecisions: Record<string, unknown>) => 
    client.post<{ rule_set: FiscalRuleSet }>(`/payroll/rule-import/${importLogId}/confirm`, { review_decisions: reviewDecisions }),
  
  reject: (importLogId: string, reason: string) => 
    client.post<{ message: string }>(`/payroll/rule-import/${importLogId}/reject`, { reason }),
  
  getPending: () => client.get<{ imports: RuleImportLog[] }>('/payroll/rule-import/pending'),
  getHistory: () => client.get<{ imports: RuleImportLog[] }>('/payroll/rule-import/history'),
  getById: (importLogId: string) => client.get<{ import_log: RuleImportLog }>(`/payroll/rule-import/${importLogId}`),
};

// ── Audit Logs ────────────────────────────────────────────────────

export const auditLogsApi = {
  logAction: (data: {
    action: string;
    entity_type: string;
    entity_id: string;
    details?: Record<string, unknown>;
  }) => client.post<AuditLog>('/payroll/audit', data),
  
  getAuditTrail: (entityType: string, entityId: string) => 
    client.get<AuditLog[]>(`/payroll/audit/trail?entity_type=${entityType}&entity_id=${entityId}`),
  
  getActionLogs: (action: string) => client.get<AuditLog[]>(`/payroll/audit/action?action=${action}`),
  getActorLogs: (actorId: string) => client.get<AuditLog[]>(`/payroll/audit/actor/${actorId}`),
  
  getAllLogs: (params?: {
    action?: string;
    entity_type?: string;
    actor_id?: string;
    date_from?: string;
    date_to?: string;
  }) => client.get<{
    logs: AuditLog[];
    count: number;
  }>('/payroll/audit', { params }),
  
  getStatistics: (params?: {
    date_from?: string;
    date_to?: string;
  }) => client.get<{
    statistics: {
      total_logs: number;
      by_action: Record<string, { count: number }>;
      by_entity_type: Record<string, { count: number }>;
      by_actor: Record<string, { count: number }>;
    };
  }>('/payroll/audit/statistics', { params }),
};

// ── Legacy Paie API (Laravel backend) ───────────────────────────────

export interface GlobalStats {
  total_paies: number;
  total_masse_salariale: number;
  total_net_mensuel: number;
  total_cnss_mensuel: number;
  total_impot_mensuel: number;
  total_deductions_mensuel: number;
  paies_en_attente: number;
  paies_validees: number;
  paies_payees: number;
  paies_mois_courant: number;
}

export const legacyPayrollApi = {
  getGlobalStats: () => client.get<GlobalStats>('/payroll/payslips/global-stats'),
  getUserStats: (userId?: string) => client.get<GlobalStats>('/paies/stats', { params: { utilisateur_id: userId } }),
  getNonPayees: () => client.get('/paies/non-payees'),
  getTotalMensuel: (year?: number, month?: number) => 
    client.get('/paies/total-mensuel', { params: { year, month } }),
  increaseSalaries: (percentage: number) => 
    client.post<{ message: string; count: number }>('/paies/increase-salaries', { percentage }),
};
