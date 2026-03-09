import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { useStages, Stage } from './useStages';
import { useProfile } from './useProfile';

export function useStagesManager() {
  const queryClient = useQueryClient();
  const { stages, isLoading } = useStages();
  const { role } = useProfile();
  const isAdmin = role === 'admin';

  useEffect(() => {
    const channel = supabase
      .channel('stages_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'etapas' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['stages'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const createStage = useMutation({
    mutationFn: async (newStage: Omit<Stage, 'id' | 'criado_em'>) => {
      if (!isAdmin) throw new Error("Apenas administradores podem gerenciar etapas.");
      const { data, error } = await (supabase.from('etapas') as any)
        .insert(newStage as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      toast.success("Etapa criada com sucesso!");
    },
    onError: (err: any) => toast.error(`Erro ao criar etapa: ${err.message}`),
  });

  const updateStage = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Stage> & { id: number }) => {
      if (!isAdmin) throw new Error("Apenas administradores podem editar etapas.");
      const { data, error } = await (supabase.from('etapas') as any)
        .update({ nome: updates.nome, cor: updates.cor } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      toast.success("Etapa atualizada com sucesso!");
    },
    onError: (err: any) => toast.error(`Erro ao atualizar etapa: ${err.message}`),
  });

  const deleteStage = useMutation({
    mutationFn: async (id: number) => {
      if (!isAdmin) throw new Error("Apenas administradores podem excluir etapas.");
      const { error } = await supabase
        .from('etapas')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.code === '23503') {
          throw new Error("Esta etapa possui leads vinculados. Mova-os para outra etapa antes de excluir.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      toast.success("Etapa excluída com sucesso!");
    },
    onError: (err: any) => toast.error(`Erro ao excluir etapa: ${err.message}`),
  });

  const updateStagesOrder = useMutation({
    mutationFn: async (orderedStages: { id: number; posicao_ordem: number }[]) => {
      if (!isAdmin) throw new Error("Apenas administradores podem reordenar etapas.");
      const { error } = await supabase.rpc('update_stages_order', { stages_data: orderedStages } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      toast.success("Ordem das etapas atualizada com sucesso!");
    },
    onError: (err: any) => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      toast.error(`Erro ao reordenar etapas: ${err.message}`);
    },
  });

  const updateStageFunnel = useMutation({
    mutationFn: async ({ id, em_funil }: { id: number; em_funil: boolean }) => {
      if (!isAdmin) throw new Error("Apenas administradores podem gerenciar o funil.");
      const { data, error } = await (supabase.from('etapas') as any)
        .update({ em_funil } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      toast.success("Configuração do funil atualizada!");
    },
    onError: (err: any) => toast.error(`Erro ao atualizar funil: ${err.message}`),
  });

  return {
    stages,
    isLoading,
    createStage,
    updateStage,
    deleteStage,
    updateStagesOrder,
    updateStageFunnel,
  };
}