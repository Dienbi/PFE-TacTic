import client from "../../api/client";

export interface Pointage {
  id: number;
  utilisateur_id: number;
  date: string;
  heure_entree: string | null;
  heure_sortie: string | null;
  duree_travail: number | null;
  absence_justifiee: boolean;
  created_at: string;
  updated_at: string;
}

export interface PointageStats {
  total_jours: number;
  total_heures: number;
  absences: number;
  absences_justifiees: number;
}

export interface PointageResponse {
  message: string;
  pointage: Pointage;
}

// Get today's attendance for current user
export const getTodayPointage = async (): Promise<Pointage | null> => {
  const response = await client.get("/pointages/today");
  return response.data;
};

// Check in
export const checkIn = async (): Promise<PointageResponse> => {
  const response = await client.post("/pointages/entree");
  return response.data;
};

// Check out
export const checkOut = async (auto: boolean = false): Promise<PointageResponse> => {
  const response = await client.post("/pointages/sortie", { auto });
  return response.data;
};

// Get attendance stats
export const getStats = async (
  startDate?: string,
  endDate?: string
): Promise<PointageStats> => {
  const params: Record<string, string> = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  
  const response = await client.get("/pointages/stats", { params });
  return response.data;
};

// Get attendance by period
export const getByPeriod = async (
  startDate: string,
  endDate: string
): Promise<Pointage[]> => {
  const response = await client.get("/pointages/period", {
    params: { start_date: startDate, end_date: endDate },
  });
  return Array.isArray(response.data) ? response.data : (response.data.data ?? []);
};

// Get user's attendance history
export const getMesPointages = async (): Promise<Pointage[]> => {
  const response = await client.get("/pointages/mes-pointages");
  // The endpoint returns a paginated response; extract the data array
  return Array.isArray(response.data) ? response.data : (response.data.data ?? []);
};
