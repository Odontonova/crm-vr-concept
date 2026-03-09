import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';

export interface Activity {
  id: string;
  usuario_id: string;
  lead_id?: string;
  campanha_id?: string;
  tipo: string;
  descricao: string;
  metadados?: any;
  criado_em: string;
}

export function useActivities(limit = 10) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['activities', orgId, limit],
    queryFn: async () => {
      if (!user || !orgId) return [];
      
      const { data, error } = await supabase
        .from('atividades')
        .select('*')
        .eq('organization_id', orgId) // MUDANÇA: Filtra por org
        .order('criado_em', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!user && !!orgId,
  });

  return {
    activities,
    isLoading,
  };
}