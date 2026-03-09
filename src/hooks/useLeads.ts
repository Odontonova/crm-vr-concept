import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { DateRange } from 'react-day-picker';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useProfile } from './useProfile';
import { Tag } from './useTags';
import { useEffect } from 'react';

export interface Lead {
  id: string;
  usuario_id: string;
  organization_id?: string;
  nome?: string;
  telefone: string;
  email?: string;
  cpf?: string;
  idade?: number;
  genero?: string;
  endereco?: string;
  queixa_principal?: string;
  procedimento_interesse?: string;
  resumo?: string;
  origem?: string; 
  fonte?: string;  
  criativo_id?: string; 
  status: string;
  posicao_pipeline: number;
  ultimo_contato?: string;
  criado_em: string;
  atualizado_em: string;
  data_nascimento?: string;
  ia_ativa?: boolean;
  ia_paused_until?: string;
  leads_tags?: { tags: Tag }[];
  agendamento?: string;
}

export function useLeads(dateRange?: DateRange) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const orgId = profile?.organization_id;

  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel('leads_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          if (payload.new && 'id' in payload.new) {
             queryClient.invalidateQueries({ queryKey: ['lead', payload.new.id] });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads_tags' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['leads'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, queryClient]);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', orgId, dateRange],
    queryFn: async () => {
      if (!user || !orgId) return [];
      
      let query = supabase
        .from('leads')
        .select(`
          *,
          leads_tags (
            tags (
              *
            )
          )
        `)
        .eq('organization_id', orgId)
        .order('criado_em', { ascending: false });

      if (dateRange?.from) {
        const startDate = startOfDay(dateRange.from).toISOString();
        const endDate = dateRange.to ? endOfDay(dateRange.to).toISOString() : endOfDay(dateRange.from).toISOString();
        
        // Modificado para considerar leads que foram CRIADOS ou ATUALIZADOS no período selecionado.
        // Isso garante que leads de meses anteriores que mudaram de etapa apareçam no mês atual.
        query = query.or(`and(criado_em.gte.${startDate},criado_em.lte.${endDate}),and(atualizado_em.gte.${startDate},atualizado_em.lte.${endDate})`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!user && !!orgId,
  });

  const createLead = useMutation({
    mutationFn: async (lead: Omit<Lead, 'id' | 'usuario_id' | 'organization_id' | 'criado_em' | 'atualizado_em'>) => {
      if (!user || !orgId) throw new Error("Usuário/Organização não autenticado");
      
      const { data, error } = await supabase
        .from('leads')
        .insert([{ ...lead, usuario_id: user.id, organization_id: orgId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', orgId] });
      toast.success('Lead criado com sucesso!', { closeButton: true });
    },
    onError: (error: any) => {
      let errorMessage = 'Erro ao criar lead';
      if (error.code === '23505') {
        errorMessage = 'Já existe um lead cadastrado com este número de telefone.';
      } else {
        errorMessage = error.message || errorMessage;
      }
      toast.error(errorMessage, { closeButton: true });
    },
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lead> & { id: string }) => {
      if (!user) throw new Error("Usuário não autenticado");
      
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads', orgId] });
      queryClient.invalidateQueries({ queryKey: ['lead', data.id] });
      toast.success('Lead atualizado com sucesso!', { closeButton: true });
    },
    onError: (error: any) => {
      let errorMessage = 'Erro ao atualizar lead';
      if (error.code === '23505') {
        errorMessage = 'Já existe outro lead cadastrado com este número de telefone.';
      } else {
        errorMessage = error.message || errorMessage;
      }
      toast.error(errorMessage, { closeButton: true });
    },
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', orgId] });
      toast.success('Lead excluído com sucesso!', { closeButton: true });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir lead', { closeButton: true });
    },
  });

  return {
    leads,
    isLoading,
    createLead: createLead.mutate,
    updateLead: updateLead.mutate,
    deleteLead: deleteLead.mutate,
  };
}

export function useLead(leadId: string | null) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!leadId) return;

    const channel = supabase
      .channel(`lead_detail_${leadId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads', filter: `id=eq.${leadId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, queryClient]);

  return useQuery<Lead | null, Error>({
    queryKey: ['lead', leadId, orgId],
    queryFn: async () => {
      if (!leadId || !user || !orgId) return null;
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .eq('organization_id', orgId)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data;
    },
    enabled: !!leadId && !!user && !!orgId,
  });
}