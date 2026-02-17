import client from "../../api/client";

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface CreateJobRequestDto {
  equipe_id: number;
  nom_poste: string;
  description_poste: string;
  justification: string;
  date_souhaitee: string;
}

export interface JobRequest {
  id: number;
  titre: string;
  description: string;
  equipe_id: number;
  demandeur_id: number;
  statut: string;
  raison_rejet?: string;
  created_at: string;
  updated_at: string;
  // aliases used in templates (mapped from titre/description)
  nom_poste: string;
  description_poste: string;
  justification?: string;
  date_souhaitee: string;
  commentaire_rh?: string;
  demandeur?: {
    id: number;
    nom: string;
    prenom: string;
    matricule: string;
  };
  equipe?: {
    id: number;
    nom: string;
  };
}

export interface Competence {
  id: number;
  nom: string;
  niveau?: number;
  pivot?: {
    niveau_requis: number;
  };
}

export interface Candidat {
  id: number;
  nom: string;
  prenom: string;
  matricule: string;
  email: string;
  statut?: string;
  equipe?: {
    id: number;
    nom: string;
  };
}

export interface JobPost {
  id: number;
  job_request_id?: number;
  titre: string;
  description: string;
  statut: string;
  published_at?: string;
  closed_at?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  competences?: Competence[];
  equipe?: {
    id: number;
    nom: string;
  };
  createdBy?: {
    id: number;
    nom: string;
    prenom: string;
  };
  applications?: JobApplication[];
  applications_count?: number;
}

export interface JobApplication {
  id: number;
  job_post_id: number;
  utilisateur_id: number;
  statut: string;
  motivation: string;
  applied_at: string;
  reviewed_at?: string;
  reviewed_by?: number;
  created_at: string;
  updated_at: string;
  // relation names – backend returns "utilisateur" / "jobPost"
  candidat: Candidat;
  offre: JobPost;
  jobPost?: JobPost;
  utilisateur?: Candidat;
}



// ── Helpers to normalise backend → frontend field names ─────────────────────

/** Backend returns `titre`/`description`, components use `nom_poste`/`description_poste` */
function normaliseJobRequest(data: any): JobRequest {
  return {
    ...data,
    nom_poste: data.nom_poste ?? data.titre,
    description_poste: data.description_poste ?? data.description,
    justification: data.justification ?? "",
    date_souhaitee: data.date_souhaitee ?? data.created_at,
    commentaire_rh: data.commentaire_rh ?? data.raison_rejet,
  };
}

/** Backend returns `utilisateur`/`jobPost`, components use `candidat`/`offre` */
function normaliseApplication(data: any): JobApplication {
  return {
    ...data,
    candidat: data.candidat ?? data.utilisateur ?? {},
    offre: data.offre ?? data.job_post ?? data.jobPost ?? {},
  };
}



// ── API Object (used by all components as `jobMatchingApi.xxx()`) ────────────

export const jobMatchingApi = {

  // ─── Job Requests ─────────────────────────────────────────────────────

  getJobRequests: async (): Promise<JobRequest[]> => {
    const response = await client.get("/job-requests");
    return (response.data?.data ?? response.data ?? []).map(normaliseJobRequest);
  },

  getJobRequestById: async (id: number): Promise<JobRequest> => {
    const response = await client.get(`/job-requests/${id}`);
    return normaliseJobRequest(response.data?.data ?? response.data);
  },

  createJobRequest: async (data: CreateJobRequestDto): Promise<JobRequest> => {
    const payload = {
      titre: data.nom_poste,
      description: data.description_poste,
      equipe_id: data.equipe_id,
      justification: data.justification,
      date_souhaitee: data.date_souhaitee,
    };
    const response = await client.post("/job-requests", payload);
    return normaliseJobRequest(response.data?.data ?? response.data);
  },

  updateJobRequest: async (
    id: number,
    data: { titre: string; description: string },
  ): Promise<void> => {
    await client.put(`/job-requests/${id}`, data);
  },

  approveJobRequest: async (id: number, commentaire?: string): Promise<void> => {
    await client.post(`/job-requests/${id}/approve`, { commentaire });
  },

  rejectJobRequest: async (id: number, raison: string): Promise<void> => {
    await client.post(`/job-requests/${id}/reject`, { raison });
  },

  deleteJobRequest: async (id: number): Promise<void> => {
    await client.delete(`/job-requests/${id}`);
  },

  getPendingJobRequests: async (): Promise<JobRequest[]> => {
    const response = await client.get("/job-requests/pending/list");
    return (response.data?.data ?? response.data ?? []).map(normaliseJobRequest);
  },

  // ─── Job Posts ────────────────────────────────────────────────────────

  getJobPosts: async (): Promise<JobPost[]> => {
    const response = await client.get("/job-posts");
    return response.data?.data ?? response.data ?? [];
  },

  getPublishedJobPosts: async (): Promise<JobPost[]> => {
    const response = await client.get("/job-posts/open");
    return response.data?.data ?? response.data ?? [];
  },

  getOpenJobPosts: async (): Promise<JobPost[]> => {
    const response = await client.get("/job-posts/open");
    return response.data?.data ?? response.data ?? [];
  },

  getJobPostById: async (id: number): Promise<JobPost> => {
    const response = await client.get(`/job-posts/${id}`);
    return response.data?.data ?? response.data;
  },

  createJobPost: async (data: {
    job_request_id?: number;
    titre: string;
    description: string;
    competences?: Array<{ competence_id: number; niveau_requis: number }>;
  }): Promise<JobPost> => {
    const response = await client.post("/job-posts", data);
    return response.data?.data ?? response.data;
  },

  updateJobPost: async (
    id: number,
    data: {
      titre?: string;
      description?: string;
      competences?: Array<{ competence_id: number; niveau_requis: number }>;
    },
  ): Promise<void> => {
    await client.put(`/job-posts/${id}`, data);
  },

  publishJobPost: async (id: number): Promise<void> => {
    await client.post(`/job-posts/${id}/publish`);
  },

  closeJobPost: async (id: number): Promise<void> => {
    await client.post(`/job-posts/${id}/close`);
  },

  deleteJobPost: async (id: number): Promise<void> => {
    await client.delete(`/job-posts/${id}`);
  },

  // ─── Applications ────────────────────────────────────────────────────

  getApplications: async (): Promise<JobApplication[]> => {
    const response = await client.get("/applications");
    return (response.data?.data ?? response.data ?? []).map(normaliseApplication);
  },

  getMyApplications: async (): Promise<JobApplication[]> => {
    const response = await client.get("/applications");
    return (response.data?.data ?? response.data ?? []).map(normaliseApplication);
  },

  getApplicationById: async (id: number): Promise<JobApplication> => {
    const response = await client.get(`/applications/${id}`);
    return normaliseApplication(response.data?.data ?? response.data);
  },

  getJobPostApplications: async (
    jobPostId: number,
  ): Promise<JobApplication[]> => {
    const response = await client.get(`/applications/job-post/${jobPostId}`);
    return (response.data?.data ?? response.data ?? []).map(normaliseApplication);
  },

  applyToJob: async (
    jobPostId: number,
    motivation: string,
  ): Promise<JobApplication> => {
    const response = await client.post("/applications", {
      job_post_id: jobPostId,
      motivation,
    });
    return normaliseApplication(response.data?.data ?? response.data);
  },

  withdrawApplication: async (id: number): Promise<void> => {
    await client.post(`/applications/${id}/withdraw`);
  },

  acceptApplication: async (id: number): Promise<void> => {
    await client.post(`/applications/${id}/review`, { action: "accept" });
  },

  rejectApplication: async (id: number): Promise<void> => {
    await client.post(`/applications/${id}/review`, { action: "reject" });
  },

  reviewApplication: async (
    id: number,
    action: "accept" | "reject" | "reviewed",
  ): Promise<void> => {
    await client.post(`/applications/${id}/review`, { action });
  },


};
