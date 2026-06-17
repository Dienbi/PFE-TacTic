import client from "./client";

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface AttendancePattern {
  type: string;
  label: string;
  confidence: number;
}

export interface AlertDate {
  date: string;
  day_name: string;
  day_name_fr?: string;
  absence_probability: number;
  reason: string;
}

export interface DailyForecast {
  date: string;
  day_name: string;
  day_name_fr?: string;
  presence_probability: number;
  absence_probability: number;
  risk_level: string;
  reason?: string;
  is_planned_leave?: boolean;
}

export interface AttendancePrediction {
  utilisateur_id: number;
  nom: string;
  prenom: string;
  matricule: string;
  predictions: DailyForecast[];
  avg_absence_risk: number;
  risk_level?: string;
  patterns?: AttendancePattern[];
  primary_pattern?: string | null;
  alert_dates?: AlertDate[];
  recommendation?: string;
  generated_at: string;
}

export interface AttendanceSummary {
  utilisateur_id: number;
  nom: string;
  prenom: string;
  matricule: string;
  avg_absence_risk: number;
  risk_level: string;
  next_day_absence_prob: number;
  patterns?: AttendancePattern[];
  primary_pattern?: string | null;
  alert_dates?: AlertDate[];
  recommendation?: string;
}

export interface ScoreFactor {
  key: string;
  label: string;
  score: number;
  weight: number;
  status: "good" | "average" | "poor";
}

export interface PerformanceResult {
  utilisateur_id: number;
  nom: string;
  prenom: string;
  matricule: string;
  performance_score: number;
  grade: string;
  grade_label?: string;
  summary?: string;
  score_factors?: ScoreFactor[];
  breakdown?: Record<string, unknown> | null;
  attendance_rate?: number | null;
  skill_count?: number | null;
  generated_at?: string | null;
}

export interface DashboardKPIs {
  generated_at: string;
  attendance_predictions: {
    predicted_absence_rate: number;
    high_risk_employees: number;
    medium_risk_employees: number;
    employees_with_alerts?: number;
    total_analyzed: number;
    top_at_risk: AttendanceSummary[];
  } | null;
  performance_scores: {
    avg_performance: number;
    min_performance: number;
    max_performance: number;
    total_scored: number;
    grade_distribution: Record<string, number>;
    top_performers: PerformanceResult[];
    needs_improvement: PerformanceResult[];
  } | null;
}

export interface MatchSkillDetail {
  nom: string;
  niveau_requis: number;
  niveau_candidat: number;
  match: boolean;
}

export interface CandidateMatchDetails {
  skill_overlap_ratio?: number;
  weighted_skill_match?: number;
  attendance_score?: number;
  tenure_years?: number;
  availability?: number;
  matching_skills?: MatchSkillDetail[];
  missing_skills?: MatchSkillDetail[];
}

export interface ScoreBreakdown {
  skills: number;
  attendance: number;
  tenure: number;
  availability: number;
}

export interface CandidateRecommendation {
  utilisateur_id: number;
  nom: string;
  prenom: string;
  matricule: string;
  email: string;
  score: number;
  verdict?: string;
  summary?: string;
  reasons?: string[];
  score_breakdown?: ScoreBreakdown;
  has_applied?: boolean;
  details: CandidateMatchDetails;
}

export interface MatchResponse {
  job_post_id: number;
  job_post_titre: string;
  total_candidates: number;
  recommendations: CandidateRecommendation[];
  model_used?: string;
  generated_at?: string;
}

export interface TrainingResult {
  model: string;
  status: string;
  result?: Record<string, unknown>;
}

export interface TrainingStatusInfo {
  training_in_progress: boolean;
  models: Record<string, unknown>;
  last_checked: string | null;
  status?: string;
}

// ── API Object ──────────────────────────────────────────────────────────────

export const aiApi = {
  getAttendancePrediction: async (userId: number): Promise<AttendancePrediction> => {
    const r = await client.get(`/ai/predictions/attendance/${userId}`);
    return r.data?.data ?? r.data;
  },

  getAttendancePredictionsAll: async (): Promise<AttendanceSummary[]> => {
    const r = await client.get("/ai/predictions/attendance");
    const data = r.data?.data ?? r.data ?? [];
    if (!Array.isArray(data)) {
      throw new Error(data?.message ?? "AI service unavailable");
    }
    return data;
  },

  getPerformanceScore: async (userId: number): Promise<PerformanceResult> => {
    const r = await client.get(`/ai/predictions/performance/${userId}`);
    return r.data?.data ?? r.data;
  },

  getPerformanceScoresAll: async (): Promise<PerformanceResult[]> => {
    const r = await client.get("/ai/predictions/performance");
    const data = r.data?.data ?? r.data ?? [];
    if (!Array.isArray(data)) {
      throw new Error(data?.message ?? "AI service unavailable");
    }
    return data;
  },

  getDashboardKPIs: async (): Promise<DashboardKPIs> => {
    const r = await client.get("/ai/dashboard-kpis");
    return r.data?.data ?? r.data;
  },

  getMatchRecommendations: async (jobPostId: number): Promise<MatchResponse> => {
    const r = await client.get(`/ai/match/${jobPostId}`);
    const data = r.data?.data ?? r.data;
    if (data?.recommendations) {
      return data as MatchResponse;
    }
    return {
      job_post_id: jobPostId,
      job_post_titre: "",
      total_candidates: Array.isArray(data) ? data.length : 0,
      recommendations: Array.isArray(data) ? data : [],
    };
  },

  triggerTraining: async (model: string): Promise<TrainingResult> => {
    const r = await client.post(`/ai/train/${model}`);
    return r.data?.data ?? r.data;
  },

  getTrainingStatus: async (): Promise<TrainingStatusInfo> => {
    const r = await client.get("/ai/train/status");
    return r.data?.data ?? r.data;
  },

  healthCheck: async (): Promise<{ status: string }> => {
    const r = await client.get("/ai/health");
    return r.data?.data ?? r.data;
  },
};
