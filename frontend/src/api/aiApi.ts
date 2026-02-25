import client from "./client";

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface DailyForecast {
  date: string;
  day_name: string;
  predicted_present: boolean;
  probability: number;
}

export interface AttendancePrediction {
  user_id: number;
  employee_name: string;
  forecast: DailyForecast[];
  risk_level: string;
  absence_probability: number;
}

export interface AttendanceSummary {
  utilisateur_id: number;
  nom: string;
  prenom: string;
  matricule: string;
  avg_absence_risk: number;
  risk_level: string;
  next_day_absence_prob: number;
}

export interface PerformanceResult {
  utilisateur_id: number;
  nom: string;
  prenom: string;
  matricule: string;
  performance_score: number;
  grade: string;
  breakdown?: Record<string, any> | null;
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
    total_analyzed: number;
    top_at_risk: any[];
  } | null;
  performance_scores: {
    avg_performance: number;
    min_performance: number;
    max_performance: number;
    total_scored: number;
    grade_distribution: Record<string, number>;
    top_performers: any[];
    needs_improvement: any[];
  } | null;
}

export interface CandidateRecommendation {
  utilisateur_id: number;
  nom: string;
  prenom: string;
  matricule: string;
  email: string;
  score: number;
  details: Record<string, any>;
}

export interface TrainingResult {
  model: string;
  status: string;
  metrics: Record<string, any>;
  message: string;
}

export interface TrainingStatusInfo {
  model: string;
  last_trained: string | null;
  metrics: Record<string, any>;
}

// ── API Object ──────────────────────────────────────────────────────────────

export const aiApi = {
  // ── Attendance Predictions ────────────────────────────────────────────
  getAttendancePrediction: async (userId: number): Promise<AttendancePrediction> => {
    const r = await client.get(`/ai/predictions/attendance/${userId}`);
    return r.data?.data ?? r.data;
  },

  getAttendancePredictionsAll: async (): Promise<AttendanceSummary[]> => {
    const r = await client.get("/ai/predictions/attendance");
    return r.data?.data ?? r.data ?? [];
  },

  // ── Performance Scores ───────────────────────────────────────────────
  getPerformanceScore: async (userId: number): Promise<PerformanceResult> => {
    const r = await client.get(`/ai/predictions/performance/${userId}`);
    return r.data?.data ?? r.data;
  },

  getPerformanceScoresAll: async (): Promise<PerformanceResult[]> => {
    const r = await client.get("/ai/predictions/performance");
    return r.data?.data ?? r.data ?? [];
  },

  // ── Dashboard KPIs ───────────────────────────────────────────────────
  getDashboardKPIs: async (): Promise<DashboardKPIs> => {
    const r = await client.get("/ai/dashboard-kpis");
    return r.data?.data ?? r.data;
  },

  // ── Job Matching ─────────────────────────────────────────────────────
  getMatchRecommendations: async (jobPostId: number): Promise<CandidateRecommendation[]> => {
    const r = await client.get(`/ai/match/${jobPostId}`);
    const data = r.data?.data ?? r.data;
    return data?.recommendations ?? data ?? [];
  },

  // ── Training ─────────────────────────────────────────────────────────
  triggerTraining: async (model: string): Promise<TrainingResult> => {
    const r = await client.post(`/ai/train/${model}`);
    return r.data?.data ?? r.data;
  },

  getTrainingStatus: async (): Promise<TrainingStatusInfo[]> => {
    const r = await client.get("/ai/train/status");
    return r.data?.data ?? r.data ?? [];
  },

  // ── Health ────────────────────────────────────────────────────────────
  healthCheck: async (): Promise<{ status: string }> => {
    const r = await client.get("/ai/health");
    return r.data?.data ?? r.data;
  },
};
