import apiClient from './client';

export interface PersonalInfoChangeRequest {
  id: string;
  employee_id: number;
  requested_marital_status: 'single' | 'married' | 'divorced' | 'widowed' | null;
  requested_children_count: number | null;
  requested_disabled_children_count: number | null;
  requested_student_children_count: number | null;
  computed_head_of_family_preview: boolean;
  claimed_effective_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_more_info';
  submitted_at: string;
  reviewed_by: number | null;
  reviewed_at: string | null;
  review_notes: string | null;
  affects_locked_payslips: boolean;
  documents?: ChangeRequestDocument[];
  employee?: Employee;
  reviewed_by_user?: Employee;
}

export interface ChangeRequestDocument {
  id: string;
  change_request_id: string;
  document_type: 'marriage_certificate' | 'divorce_judgment' | 'death_certificate' | 'birth_certificate' | 'disability_certificate' | 'school_enrollment_certificate';
  file_path: string;
  uploaded_at: string;
  verified_by_hr: boolean;
  verified_by: number | null;
  verification_notes: string | null;
}

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
  source_change_request_id: string | null;
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

// Personal Info Change Requests
export const fiscalProfileApi = {
  // Change Requests
  submitChangeRequest: (data: {
    requested_marital_status?: string;
    requested_children_count?: number;
    requested_disabled_children_count?: number;
    requested_student_children_count?: number;
    claimed_effective_date: string;
    documents: { type: string; path: string }[];
  }) => 
    apiClient.post<PersonalInfoChangeRequest>('/payroll/fiscal-profile/change-requests', data),

  getChangeRequests: (params?: { status?: string; page?: number; per_page?: number }) =>
    apiClient.get('/payroll/fiscal-profile/change-requests', { params }),

  getChangeRequest: (id: string) =>
    apiClient.get<PersonalInfoChangeRequest>(`/payroll/fiscal-profile/change-requests/${id}`),

  approveChangeRequest: (id: string) =>
    apiClient.post(`/payroll/fiscal-profile/change-requests/${id}/approve`),

  rejectChangeRequest: (id: string, notes: string) =>
    apiClient.post(`/payroll/fiscal-profile/change-requests/${id}/reject`, { notes }),

  uploadDocument: (requestId: string, type: string, path: string) =>
    apiClient.post(`/payroll/fiscal-profile/change-requests/${requestId}/documents`, { type, path }),

  verifyDocument: (requestId: string, docId: string, verified: boolean, notes?: string) =>
    apiClient.patch(`/payroll/fiscal-profile/change-requests/${requestId}/documents/${docId}/verify`, { verified, notes }),

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
