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

// Export attendance to CSV (Excel-compatible)
export const exportAttendanceToExcel = (pointages: Pointage[], userName: string): void => {
  // Format data for CSV
  const headers = ['Date', 'Entry Time', 'Exit Time', 'Duration (hours)', 'Status'];
  const rows = pointages.map((p) => {
    const duration = p.duree_travail ? (typeof p.duree_travail === 'string' ? parseFloat(p.duree_travail) : p.duree_travail) : 0;
    return [
      new Date(p.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      p.heure_entree ? p.heure_entree.substring(0, 5) : '--:--',
      p.heure_sortie ? p.heure_sortie.substring(0, 5) : '--:--',
      `${duration.toFixed(1)}h`,
      !p.heure_entree && p.absence_justifiee ? 'Justified absence' : !p.heure_entree ? 'Absent' : !p.heure_sortie ? 'In progress' : 'Complete'
    ];
  });
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  // Add BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Generate filename with date
  const date = new Date().toISOString().split('T')[0];
  const filename = `${userName.replace(/\s+/g, '_')}_attendance_${date}.csv`;
  
  // Download file
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};
