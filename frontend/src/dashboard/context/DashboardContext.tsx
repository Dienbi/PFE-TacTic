import React, { createContext, useContext, useState, useCallback } from 'react';
import client from '../../api/client';

interface DashboardData {
  stats: any;
  trend: any[];
  absence: any[];
  logs: any[];
  account_requests: any[];
  recent_leaves: any[];
}

interface DashboardContextType {
  data: DashboardData | null;
  users: any[] | null;
  teams: any[] | null;
  loading: boolean;
  fetchDashboardData: (force?: boolean) => Promise<void>;
  fetchUsersAndTeams: (force?: boolean) => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [users, setUsers] = useState<any[] | null>(null);
  const [teams, setTeams] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDashboardData = useCallback(async (force = false) => {
    // If data already exists and we are not forcing a refresh, skip fetching
    if (data && !force) return;

    setLoading(true);
    try {
      const response = await client.get('/dashboard/all?months=6');
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [data]);

  const fetchUsersAndTeams = useCallback(async (force = false) => {
    if (users && teams && !force) return;

    setLoading(true);
    try {
      const [usersRes, teamsRes] = await Promise.all([
        client.get('/utilisateurs'),
        client.get('/equipes'),
      ]);
      setUsers(usersRes.data);
      setTeams(teamsRes.data);
    } catch (error) {
      console.error('Failed to fetch users or teams:', error);
    } finally {
      setLoading(false);
    }
  }, [users, teams]);

  return (
    <DashboardContext.Provider value={{
        data,
        users,
        teams,
        loading,
        fetchDashboardData,
        fetchUsersAndTeams
    }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
