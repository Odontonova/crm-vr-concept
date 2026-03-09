import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export interface MessageTemplate {
  id: string;
  usuario_id: string;
  nome: string;
  categoria: string;
  conteudo: string;
  variaveis?: any;
  esta_ativo?: boolean;
  contagem_uso?: number;
  criado_em: string;
  atualizado_em: string;
  organization_id?: string;
}

export function useMessageTemplates() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['message_templates', orgId],
    queryFn: async () => {
      if (!user || !orgId) return [];
      
      const { data, error } = await supabase
        .from('templates_mensagem')
        .select('*')
        .eq('organization_id', orgId) // MUDANÇA: Filtra por org
        .order('criado_em', { ascending: false });

      if (error) throw error;
      return data as MessageTemplate[];
    },
    enabled: !!user && !!orgId,
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Omit<MessageTemplate, 'id' | 'usuario_id' | 'criado_em' | 'atualizado_em' | 'contagem_uso' | 'esta_ativo' | 'organization_id'>) => {
      if (!user || !orgId) throw new Error("Usuário não autenticado");
      
      const { data, error } = await supabase
        .from('templates_mensagem')
        .insert([{ ...template, usuario_id: user.id, organization_id: orgId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message_templates', orgId] });
      toast.success('Template criado com sucesso!', { closeButton: true });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar template', { closeButton: true });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MessageTemplate> & { id: string }) => {
      if (!user) throw new Error("Usuário não autenticado");
      
      const { data, error } = await supabase
        .from('templates_mensagem')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message_templates', orgId] });
      toast.success('Template atualizado com sucesso!', { closeButton: true });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar template', { closeButton: true });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Usuário não autenticado");
      
      const { error } = await supabase
        .from('templates_mensagem')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message_templates', orgId] });
      toast.success('Template excluído com sucesso!', { closeButton: true });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir template', { closeButton: true });
    },
  });

  return {
    templates,
    isLoading,
    createTemplate: createTemplate.mutate,
    updateTemplate: updateTemplate.mutate,
    deleteTemplate: deleteTemplate.mutate,
  };
}