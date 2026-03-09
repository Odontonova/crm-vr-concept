import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';
import { useMemo } from 'react';
import { toast } from 'sonner';

export function useLeadSources() {
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['lead_sources', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      
      const { data, error } = await supabase
        .from('fontes')
        .select('nome')
        .eq('organization_id', orgId);

      if (error) {
        console.error("Error fetching lead sources:", error);
        return [];
      };
      
      return data.map(item => item.nome);
    },
    enabled: !!orgId,
  });

  const createSource = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      if (!orgId) throw new Error("Organização não encontrada");
      
      const { data, error } = await supabase
        .from('fontes')
        .insert({ nome: name, organization_id: orgId })
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead_sources', orgId] });
      queryClient.invalidateQueries({ queryKey: ['sources', orgId] });
    },
    onError: (err: any) => {
      if (err.code !== '23505') {
        toast.error(`Erro ao criar fonte: ${err.message}`);
      }
    }
  });

  const allSources = useMemo(() => {
    return [...sources].sort((a, b) => a.localeCompare(b));
  }, [sources]);

  return { allSources, isLoading, createSource: createSource.mutate };
}