import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Stage {
  id: number;
  nome: string;
  cor: string;
  posicao_ordem: number;
  criado_em: string;
  em_funil: boolean;
}

export function useStages() {
  const { user } = useAuth();

  const { data: stages = [], isLoading } = useQuery({
    queryKey: ['stages', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('etapas')
        .select('*')
        .order('posicao_ordem', { ascending: true });

      // As etapas são globais, mas vamos garantir que só usuários autenticados possam acessá-las
      if (error) throw error;
      return data as Stage[];
    },
    enabled: !!user,
  });

  return {
    stages,
    isLoading,
  };
}