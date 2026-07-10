import client from './client';

export interface PerformanceReview {
  id: number;
  utilisateur_id: number;
  chef_id: number;
  score: number;
  message: string;
  review_date: string;
  created_at: string;
  updated_at: string;
  employee?: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    matricule: string;
  };
  chef?: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
  };
}

export interface CreatePerformanceReviewRequest {
  utilisateur_id: number;
  score: number;
  message: string;
  review_date: string;
}

export interface UpdatePerformanceReviewRequest {
  utilisateur_id?: number;
  score?: number;
  message?: string;
  review_date?: string;
}

export const performanceReviewsApi = {
  // Create a new performance review
  create: async (data: CreatePerformanceReviewRequest) => {
    const response = await client.post('/performance-reviews', data);
    return response.data;
  },

  // Update a performance review
  update: async (id: number, data: UpdatePerformanceReviewRequest) => {
    const response = await client.put(`/performance-reviews/${id}`, data);
    return response.data;
  },

  // Delete a performance review
  delete: async (id: number) => {
    const response = await client.delete(`/performance-reviews/${id}`);
    return response.data;
  },

  // Get performance review by ID
  getById: async (id: number): Promise<PerformanceReview> => {
    const response = await client.get(`/performance-reviews/${id}`);
    return response.data;
  },

  // Get employee feedback history
  getEmployeeHistory: async (employeeId: number): Promise<PerformanceReview[]> => {
    const response = await client.get(`/performance-reviews/employee/${employeeId}`);
    return response.data;
  },

  // Get latest feedback for an employee
  getLatestFeedback: async (employeeId: number): Promise<PerformanceReview | null> => {
    try {
      const response = await client.get(`/performance-reviews/employee/${employeeId}/latest`);
      return response.data;
    } catch (error) {
      return null;
    }
  },

  // Get team feedback (for manager)
  getTeamFeedback: async (): Promise<PerformanceReview[]> => {
    const response = await client.get('/performance-reviews/team');
    return response.data;
  },

  // Get all feedback (for HR)
  getAllFeedback: async (): Promise<PerformanceReview[]> => {
    const response = await client.get('/performance-reviews/all');
    return response.data;
  },
};
