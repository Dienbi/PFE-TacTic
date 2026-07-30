import apiClient from './client';

export interface FiscalProfileGroup {
  id: string;
  gender: 'male' | 'female';
  marital_status: 'single' | 'married' | 'divorced' | 'widowed';
  head_of_family: boolean;
  children_count: number;
  disabled_children_count: number;
  student_non_scholarship_children_count: number;
  label: string;
}

export interface EmployeeFiscalProfileAssignment {
  id: string;
  employee_id: number;
  fiscal_profile_group_id: string;
  effective_from: string;
  effective_to: string | null;
  assigned_by: number;
  assigned_at: string;
  fiscal_profile_group?: FiscalProfileGroup;
}

export interface HeadOfFamilyOverride {
  id: string;
  employee_id: number;
  overridden_value: boolean;
  justification_note: string;
  document_file_path: string | null;
  approved_by: number;
  approved_at: string;
}

export interface Employee {
  id: number;
  nom: string;
  prenom: string;
  matricule: string;
  email: string;
}

// Fiscal Profile API
export const fiscalProfileApi = {
  // Fiscal Profile Groups
  getFiscalProfileGroups: () =>
    apiClient.get<FiscalProfileGroup[]>('/payroll/fiscal-profile/groups'),

  getFiscalProfileGroup: (id: string) =>
    apiClient.get<FiscalProfileGroup>(`/payroll/fiscal-profile/groups/${id}`),

  deleteFiscalProfileGroup: (id: string) =>
    apiClient.delete(`/payroll/fiscal-profile/groups/${id}`),

  createFiscalProfileGroup: (data: {
    gender: string;
    marital_status: string;
    children_count: number;
    disabled_children_count?: number;
    student_non_scholarship_children_count?: number;
  }) =>
    apiClient.post<{message: string, group: FiscalProfileGroup}>('/payroll/fiscal-profile/groups', data),

  getGroupEmployees: (id: string) =>
    apiClient.get<Employee[]>(`/payroll/fiscal-profile/groups/${id}/employees`),

  matchFiscalProfileGroup: (params: {
    gender: string;
    marital_status: string;
    children_count: number;
    disabled_children_count?: number;
    student_non_scholarship_children_count?: number;
  }) =>
    apiClient.get('/payroll/fiscal-profile/groups/match', { params }),

  // Employee Fiscal Profiles
  getEmployeeFiscalHistory: (employeeId: number) =>
    apiClient.get<EmployeeFiscalProfileAssignment[]>(`/payroll/fiscal-profile/employees/${employeeId}/fiscal-profile-history`),

  getEmployeeCurrentFiscalProfile: (employeeId: number) =>
    apiClient.get<EmployeeFiscalProfileAssignment>(`/payroll/fiscal-profile/employees/${employeeId}/fiscal-profile`),

  bulkAssignFiscalProfile: (groupId: string, data: {
    employee_ids: number[];
    effective_from: string;
    ai_message_id?: string;
  }) =>
    apiClient.post(`/payroll/fiscal-profile/groups/${groupId}/bulk-assign`, data),

  assignFiscalProfile: (employeeId: number, groupId: string, effectiveFrom: string) =>
    apiClient.post(`/payroll/fiscal-profile/employees/${employeeId}/fiscal-profile-assign`, {
      group_id: groupId,
      effective_from: effectiveFrom,
    }),

  searchEmployeesByFiscalCriteria: (params: {
    gender?: string;
    marital_status?: string;
    children_count?: number;
    disabled_children_count?: number;
    student_children_count?: number;
    exclude_group_id?: string;
  }) =>
    apiClient.get('/payroll/fiscal-profile/employees/fiscal-search', { params }),

  // Head of Family Overrides
  getEmployeeOverrides: (employeeId: number) =>
    apiClient.get<HeadOfFamilyOverride[]>(`/payroll/fiscal-profile/employees/${employeeId}/fiscal-profile-overrides`),

  getEmployeeActiveOverride: (employeeId: number) =>
    apiClient.get<HeadOfFamilyOverride>(`/payroll/fiscal-profile/employees/${employeeId}/fiscal-profile-overrides/active`),

  createHeadOfFamilyOverride: (employeeId: number, data: {
    overridden_value: boolean;
    justification_note: string;
    document_file_path?: string;
  }) =>
    apiClient.post<HeadOfFamilyOverride>(`/payroll/fiscal-profile/employees/${employeeId}/fiscal-profile-overrides`, data),

  // AI Chat
  sendAiMessage: (message: string, sessionId?: string, authToken?: string) =>
    apiClient.post('/payroll/fiscal-profile/ai-chat/message', { message, session_id: sessionId, auth_token: authToken }),

  getAiChatSession: (id: string) =>
    apiClient.get(`/payroll/fiscal-profile/ai-chat/session/${id}`),

  getAiChatSessions: () =>
    apiClient.get('/payroll/fiscal-profile/ai-chat/sessions'),
};
