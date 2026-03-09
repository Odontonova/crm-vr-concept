import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export interface Source {
  id: string;
  nome: string;
  organization_id: string;
  criado_em: string;
}

export function useSourcesManager() {
  const { profile, role } = useProfile();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();
  const isAdmin = role === 'admin';

  const { data: sources = [], isLoading } = useQuery<Source[]>({
    queryKey: ['sources', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('fontes')
        .select('*')
        .eq('organization_id', orgId)
        .order('nome', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const createSource = useMutation({
    mutationFn: async (newSource: { nome: string }) => {
      if (!isAdmin) throw new Error("Apenas administradores podem criar fontes.");
      if (!orgId) throw new Error("Organização não encontrada.");
      const { data, error } = await supabase
        .from('fontes')
        .insert({ ...newSource, organization_id: orgId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources', orgId] });
      queryClient.invalidateQueries({ queryKey: ['lead_sources', orgId] });
      toast.success("Fonte criada com sucesso!");
    },
    onError: (err: any) => {
      if (err.code === '23505') {
        toast.error("Erro: Já existe uma fonte com este nome.");
      } else {
        toast.error(`Erro ao criar fonte: ${err.message}`);
      }
    },
  });

  const updateSource = useMutation({
    mutationFn: async (updatedSource: Pick<Source, 'id' | 'nome'>) => {
      if (!isAdmin) throw new Error("Apenas administradores podem editar fontes.");
      const { data, error } = await supabase
        .from('fontes')
        .update({ nome: updatedSource.nome })
        .eq('id', updatedSource.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources', orgId] });
      queryClient.invalidateQueries({ queryKey: ['lead_sources', orgId] });
      toast.success("Fonte atualizada com sucesso!");
    },
    onError: (err: any) => {
      if (err.code === '23505') {
        toast.error("Erro: Já existe uma fonte com este nome.");
      } else {
        toast.error(`Erro ao atualizar fonte: ${err.message}`);
      }
    },
  });

  const deleteSource = useMutation({
    mutationFn: async (id: string) => {
      if (!isAdmin) throw new Error("Apenas administradores podem excluir fontes.");
      const { error } = await supabase.from('fontes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources', orgId] });
      queryClient.invalidateQueries({ queryKey: ['lead_sources', orgId] });
      toast.success("Fonte excluída com sucesso!");
    },
    onError: (err: any) => {
      toast.error(`Erro ao excluir fonte: ${err.message}`);
    },
  });

  return {
    sources,
    isLoading,
    createSource,
    updateSource,
    deleteSource,
  };
}