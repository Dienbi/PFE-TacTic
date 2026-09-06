import apiClient from './client';

// Role Profile Interfaces
export interface RoleProfile {
  id: string;
  name: string;
  horaire_type: 'fixed' | 'shift' | 'hourly';
  salary_type: 'fixed_monthly' | 'hourly' | 'commission' | 'piece_rate';
  weekly_hours: number | null;
  overtime_eligible: boolean;
  overtime_rate_multiplier: number | null;
  base_salary_min: number | null;
  base_salary_max: number | null;
  cnss_regime: string | null;
  label: string;
  allowances?: RoleProfileAllowance[];
  created_at: string;
  updated_at: string;
}

export interface RoleProfileAllowance {
  id: string;
  role_profile_id: string;
  allowance_type: 'transport' | 'meal' | 'housing' | 'other';
  amount: number;
  is_percentage: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeRoleAssignment {
  id: string;
  employee_id: number;
  role_profile_id: string;
  effective_from: string;
  effective_to: string | null;
  assigned_by: number;
  assigned_at: string;
  source_change_request_id: string | null;
  role_profile?: RoleProfile;
  assigned_by_user?: Employee;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: number;
  nom: string;
  prenom: string;
  matricule: string;
  email: string;
}

// Role Profile API
export const roleProfileApi = {
  // Role Profiles
  getRoleProfiles: () =>
    apiClient.get<RoleProfile[]>('/payroll/role-profiles'),

  getRoleProfile: (id: string) =>
    apiClient.get<RoleProfile>(`/payroll/role-profiles/${id}`),

  createRoleProfile: (data: {
    name: string;
    horaire_type: string;
    salary_type: string;
    weekly_hours?: number;
    overtime_eligible?: boolean;
    overtime_rate_multiplier?: number;
    base_salary_min?: number;
    base_salary_max?: number;
    cnss_regime?: string;
  }) =>
    apiClient.post<RoleProfile>('/payroll/role-profiles', data),

  updateRoleProfile: (id: string, data: {
    name?: string;
    horaire_type?: string;
    salary_type?: string;
    weekly_hours?: number;
    overtime_eligible?: boolean;
    overtime_rate_multiplier?: number;
    base_salary_min?: number;
    base_salary_max?: number;
    cnss_regime?: string;
  }) =>
    apiClient.put<RoleProfile>(`/payroll/role-profiles/${id}`, data),

  deleteRoleProfile: (id: string) =>
    apiClient.delete(`/payroll/role-profiles/${id}`),

  getRoleProfileEmployees: (id: string) =>
    apiClient.get<Employee[]>(`/payroll/role-profiles/${id}/employees`),

  getAllEmployees: () =>
    apiClient.get<Employee[]>('/payroll/employees'),

  searchRoleProfiles: (query: string) =>
    apiClient.get<RoleProfile[]>('/payroll/role-profiles/search', { params: { q: query } }),

  // Employee Role Assignments
  assignRole: (employeeId: number, data: {
    role_profile_id: string;
    effective_from: string;
  }) =>
    apiClient.post<EmployeeRoleAssignment>(`/payroll/employees/${employeeId}/role-assign`, data),

  reassignRole: (employeeId: number, data: {
    role_profile_id: string;
    effective_from: string;
  }) =>
    apiClient.post<EmployeeRoleAssignment>(`/payroll/employees/${employeeId}/role-reassign`, data),

  getCurrentRoleAssignment: (employeeId: number) =>
    apiClient.get<EmployeeRoleAssignment>(`/payroll/employees/${employeeId}/role-current`),

  getRoleAssignmentHistory: (employeeId: number) =>
    apiClient.get<EmployeeRoleAssignment[]>(`/payroll/employees/${employeeId}/role-history`),

  bulkAssignRoles: (data: {
    assignments: Array<{
      employee_id: number;
      role_profile_id: string;
      effective_from: string;
    }>;
  }) =>
    apiClient.post<EmployeeRoleAssignment[]>('/payroll/role-profiles/bulk-assign', data),

  closeRoleAssignment: (assignmentId: string, effectiveTo: string) =>
    apiClient.post<EmployeeRoleAssignment>(`/payroll/role-profiles/assignments/${assignmentId}/close`, {
      effective_to: effectiveTo,
    }),
};
