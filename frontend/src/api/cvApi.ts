import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import client from './client';

// Types
export interface CvUploadResponse {
  success: boolean;
  message: string;
  cv_upload_id: number;
  status: string;
}

export interface CvStatusResponse {
  id: number;
  status: string;
  extracted_data: ExtractedSkills | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExtractedSkills {
  technical_skills: TechnicalSkill[];
  soft_skills: SoftSkill[];
  languages_spoken: Language[];
  certifications: Certification[];
}

export interface TechnicalSkill {
  name: string;
  category: string;
  confidence: string;
}

export interface SoftSkill {
  name: string;
  confidence: string;
}

export interface Language {
  language: string;
  proficiency: string | null;
}

export interface Certification {
  name: string;
  issuer: string | null;
}

// Upload CV
export const useUploadCv = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('cv', file);

      const response = await client.post<CvUploadResponse>('/cv/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate latest CV status query
      queryClient.invalidateQueries({ queryKey: ['cv-latest'] });
    },
  });
};

// Confirm extracted skills
export const useConfirmSkills = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cvUploadId, skills }: { cvUploadId: number; skills: ExtractedSkills }) => {
      const response = await client.post(`/cv/${cvUploadId}/confirm`, { skills });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate user profile and skills
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
      queryClient.invalidateQueries({ queryKey: ['cv-latest'] });
    },
  });
};

// Get latest CV status
export const useCvLatest = () => {
  return useQuery({
    queryKey: ['cv-latest'],
    queryFn: async () => {
      const response = await client.get<{ success: boolean; data: CvStatusResponse | null }>('/cv/latest');
      return response.data.data;
    },
    refetchInterval: 2000, // Poll every 2 seconds
    refetchIntervalInBackground: true,
  });
};

// Get specific CV upload status
export const useCvStatus = (cvUploadId: number) => {
  return useQuery({
    queryKey: ['cv-status', cvUploadId],
    queryFn: async () => {
      const response = await client.get<{ success: boolean; data: CvStatusResponse }>(`/cv/${cvUploadId}`);
      return response.data.data;
    },
    enabled: !!cvUploadId,
    refetchInterval: 2000, // Poll every 2 seconds
    refetchIntervalInBackground: true,
  });
};
