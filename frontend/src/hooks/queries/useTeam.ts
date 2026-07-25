import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import { queryKeys } from '../../api/queryKeys';

interface TeamMember {
  id: number;
  prenom: string;
  nom: string;
  email: string;
  matricule: string;
  poste?: string;
  status: string;
  actif: boolean;
  telephone?: string;
  date_embauche?: string;
  salaire_base?: number;
  equipe_id?: number | null;
}

interface TeamData {
  id: number;
  nom: string;
  chef_id: number;
  chef_equipe?: {
    id: number;
    prenom: string;
    nom: string;
    email: string;
  };
  membres?: TeamMember[];
}

export const useMyTeam = () =>
  useQuery({
    queryKey: ['my-team'],
    queryFn: async () => {
      const response = await client.get('/equipes/my-team');
      return response.data as TeamData | null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
