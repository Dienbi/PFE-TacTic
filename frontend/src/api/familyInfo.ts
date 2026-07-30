import client from './client';

export interface Child {
  id: number;
  utilisateur_id: number;
  nom: string;
  prenom: string;
  date_naissance: string;
  status: 'healthy' | 'disabled' | 'university';
  document_path?: string;
  verified?: boolean;
  verified_at?: string;
  rejected?: boolean;
  rejected_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  utilisateur?: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    matricule: string;
  };
}

export interface SocialStatusProof {
  id: number;
  utilisateur_id: number;
  social_status: 'single' | 'married' | 'divorced' | 'widowed';
  document_path?: string;
  verified: boolean;
  verified_at?: string;
  status?: 'pending' | 'verified' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  utilisateur?: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    matricule: string;
  };
}

export interface CreateChildRequest {
  nom: string;
  prenom: string;
  date_naissance: string;
  status: 'healthy' | 'disabled' | 'university';
  document?: File;
}

export interface UpdateChildRequest {
  nom?: string;
  prenom?: string;
  date_naissance?: string;
  status?: 'healthy' | 'disabled' | 'university';
  document?: File;
}

export interface CreateSocialStatusRequest {
  social_status: 'single' | 'married' | 'divorced' | 'widowed';
  document?: File;
}

// Children API
export const getChildren = async (): Promise<Child[]> => {
  const response = await client.get('/children');
  return response.data;
};

export const createChild = async (data: CreateChildRequest): Promise<Child> => {
  const formData = new FormData();
  formData.append('nom', data.nom);
  formData.append('prenom', data.prenom);
  formData.append('date_naissance', data.date_naissance);
  formData.append('status', data.status);
  
  if (data.document) {
    formData.append('document', data.document);
  }

  const response = await client.post('/children', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const updateChild = async (id: number, data: UpdateChildRequest): Promise<void> => {
  const formData = new FormData();
  
  if (data.nom) formData.append('nom', data.nom);
  if (data.prenom) formData.append('prenom', data.prenom);
  if (data.date_naissance) formData.append('date_naissance', data.date_naissance);
  if (data.status) formData.append('status', data.status);
  if (data.document) formData.append('document', data.document);

  await client.put(`/children/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const deleteChild = async (id: number): Promise<void> => {
  await client.delete(`/children/${id}`);
};

// Social Status API
export const getSocialStatusHistory = async (): Promise<SocialStatusProof[]> => {
  const response = await client.get('/social-status');
  return response.data;
};

export const updateSocialStatus = async (data: CreateSocialStatusRequest): Promise<SocialStatusProof> => {
  const formData = new FormData();
  formData.append('social_status', data.social_status);
  
  if (data.document) {
    formData.append('document', data.document);
  }

  const response = await client.post('/social-status', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const verifySocialStatus = async (id: number): Promise<void> => {
  await client.post(`/social-status/${id}/verify`);
};

export const rejectSocialStatus = async (id: number, reason: string): Promise<void> => {
  await client.post(`/social-status/${id}/reject`, { rejection_reason: reason });
};

export const getPendingSocialStatusForHR = async (): Promise<SocialStatusProof[]> => {
  const response = await client.get('/social-status/hr/pending');
  return response.data;
};

export const verifyChild = async (id: number): Promise<void> => {
  await client.post(`/children/${id}/verify`);
};

export const rejectChild = async (id: number, reason: string): Promise<void> => {
  await client.post(`/children/${id}/reject`, { rejection_reason: reason });
};

export const getPendingChildrenForHR = async (): Promise<Child[]> => {
  const response = await client.get('/children/hr/pending');
  return response.data;
};

// Notification interfaces
export interface Notification {
  id: number;
  utilisateur_id: number;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

// Notification API
export const getNotifications = async (): Promise<Notification[]> => {
  const response = await client.get('/notifications');
  return response.data;
};

export const getUnreadNotifications = async (): Promise<Notification[]> => {
  const response = await client.get('/notifications/unread');
  return response.data;
};

export const markNotificationAsRead = async (id: number): Promise<void> => {
  await client.post(`/notifications/${id}/read`);
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  await client.post('/notifications/read-all');
};

// Personal Info Change Request interfaces
export interface ChangeRequestDocument {
  id: string;
  change_request_id: string;
  document_type: 'marriage_certificate' | 'divorce_judgment' | 'death_certificate' | 'birth_certificate' | 'disability_certificate' | 'school_enrollment_certificate';
  file_path: string;
  uploaded_at: string;
  verified_by_hr: boolean;
  verified_by?: number;
  verification_notes?: string;
  created_at: string;
  updated_at: string;
  verifiedBy?: {
    id: number;
    nom: string;
    prenom: string;
  };
}

export interface PersonalInfoChangeRequest {
  id: string;
  employee_id: number;
  requested_marital_status?: 'single' | 'married' | 'divorced' | 'widowed';
  requested_children_count?: number;
  requested_disabled_children_count?: number;
  requested_student_children_count?: number;
  computed_head_of_family_preview: boolean;
  claimed_effective_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_more_info';
  submitted_at: string;
  reviewed_by?: number;
  reviewed_at?: string;
  review_notes?: string;
  affects_locked_payslips: boolean;
  created_at: string;
  updated_at: string;
  employee?: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    matricule: string;
    gender: 'male' | 'female';
    marital_status: 'single' | 'married' | 'divorced' | 'widowed';
    children_count: number;
  };
  reviewedBy?: {
    id: number;
    nom: string;
    prenom: string;
  };
  documents?: ChangeRequestDocument[];
}

export interface CreateChangeRequestRequest {
  requested_marital_status?: 'single' | 'married' | 'divorced' | 'widowed';
  requested_children_count?: number;
  requested_disabled_children_count?: number;
  requested_student_children_count?: number;
  claimed_effective_date: string;
}

export interface UploadDocumentRequest {
  document_type: 'marriage_certificate' | 'divorce_judgment' | 'death_certificate' | 'birth_certificate' | 'disability_certificate' | 'school_enrollment_certificate';
  document: File;
}

// Personal Info Change Request API
export const getChangeRequests = async (): Promise<PersonalInfoChangeRequest[]> => {
  const response = await client.get('/change-requests');
  return response.data;
};

export const getChangeRequest = async (id: string): Promise<PersonalInfoChangeRequest> => {
  const response = await client.get(`/change-requests/${id}`);
  return response.data;
};

export const createChangeRequest = async (data: CreateChangeRequestRequest): Promise<PersonalInfoChangeRequest> => {
  const response = await client.post('/change-requests', data);
  return response.data;
};

export const uploadChangeRequestDocument = async (changeRequestId: string, data: UploadDocumentRequest): Promise<ChangeRequestDocument> => {
  const formData = new FormData();
  formData.append('document_type', data.document_type);
  formData.append('document', data.document);

  const response = await client.post(`/change-requests/${changeRequestId}/documents`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const verifyChangeRequestDocument = async (documentId: string, notes?: string): Promise<void> => {
  await client.post(`/change-requests/documents/${documentId}/verify`, { verification_notes: notes });
};

export const approveChangeRequest = async (id: string): Promise<any> => {
  const response = await client.post(`/change-requests/${id}/approve`);
  return response.data;
};

export const rejectChangeRequest = async (id: string, reason: string): Promise<void> => {
  await client.post(`/change-requests/${id}/reject`, { reason });
};

export const requestMoreInfoForChangeRequest = async (id: string, reason: string): Promise<void> => {
  await client.post(`/change-requests/${id}/request-more-info`, { reason });
};

export const getChangeRequestsForHR = async (status?: 'pending' | 'needs_more_info'): Promise<PersonalInfoChangeRequest[]> => {
  const params = status ? { status } : {};
  const response = await client.get('/change-requests/hr', { params });
  return response.data;
};
