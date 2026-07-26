import client from './client';

export interface Child {
  id: number;
  utilisateur_id: number;
  nom: string;
  prenom: string;
  date_naissance: string;
  status: 'healthy' | 'disabled' | 'university';
  document_path?: string;
  created_at: string;
  updated_at: string;
}

export interface SocialStatusProof {
  id: number;
  utilisateur_id: number;
  social_status: 'single' | 'married' | 'divorced' | 'widowed';
  document_path?: string;
  verified: boolean;
  verified_at?: string;
  created_at: string;
  updated_at: string;
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
