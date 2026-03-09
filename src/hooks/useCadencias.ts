import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { toast } from 'sonner';
import { DateRange } from 'react-day-picker';
import { format, startOfDay, endOfDay } from 'date-fns';

export interface CadenciaPasso {
  id?: string;
  cadencia_id?: string;
  posicao_ordem: number;
  tempo_espera: number;
  unidade_tempo: string;
  tipo_mensagem: string;
  conteudo: string;
  arquivo_path?: string | null;
  file?: File | null;
}

export interface Cadencia {
  id: string;
  organization_id: string;
  nome: string;
  descricao: string | null;
  criado_em: string;
  passos?: CadenciaPasso[];
}

export interface CadenciaLog {
  id: string;
  lead_id: string;
  cadencia_id: string;
  passo_ordem: number;
  status: string;
  mensagem_erro: string | null;
  enviado_em: string;
  leads?: { nome: string; telefone: string };
  cadencias?: { nome: string };
}

export function useCadencias() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  const { data: cadencias = [], isLoading } = useQuery({
    queryKey: ['cadencias', orgId],
    queryFn: async () => {
      if (!user || !orgId) return [];

      const { data, error } = await supabase
        .from('cadencias')
        .select(`
          *,
          cadencia_passos (*)
        `)
        .eq('organization_id', orgId)
        .order('criado_em', { ascending: false });

      if (error) throw error;

      const formatted = data.map(c => ({
        ...c,
        passos: (c.cadencia_passos || []).sort((a: any, b: any) => a.posicao_ordem - b.posicao_ordem)
      }));

      return formatted as Cadencia[];
    },
    enabled: !!user && !!orgId,
  });

  const saveCadencia = useMutation({
    mutationFn: async (payload: { id?: string, nome: string, descricao: string, passos: CadenciaPasso[] }) => {
      if (!user || !orgId) throw new Error("Não autenticado");

      let cadenciaId = payload.id;

      if (cadenciaId) {
        const { error } = await supabase
          .from('cadencias')
          .update({ nome: payload.nome, descricao: payload.descricao, atualizado_em: new Date().toISOString() })
          .eq('id', cadenciaId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('cadencias')
          .insert({ organization_id: orgId, nome: payload.nome, descricao: payload.descricao })
          .select('id')
          .single();
        if (error) throw error;
        cadenciaId = data.id;
      }

      const processados = await Promise.all(payload.passos.map(async (passo, index) => {
        let arquivo_path = passo.arquivo_path;

        if (passo.file) {
          const fileExt = passo.file.name.split('.').pop();
          const fileName = `${Date.now()}-${index}.${fileExt}`;
          const filePath = `${orgId}/cadencias/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('media-mensagens')
            .upload(filePath, passo.file);

          if (uploadError) throw uploadError;
          arquivo_path = filePath;
        }

        return {
          cadencia_id: cadenciaId,
          posicao_ordem: index + 1,
          tempo_espera: passo.tempo_espera,
          unidade_tempo: passo.unidade_tempo,
          tipo_mensagem: passo.tipo_mensagem,
          conteudo: passo.conteudo || '',
          arquivo_path: arquivo_path
        };
      }));

      await supabase.from('cadencia_passos').delete().eq('cadencia_id', cadenciaId);
      const { error: insertStepsError } = await supabase.from('cadencia_passos').insert(processados);

      if (insertStepsError) throw insertStepsError;

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cadencias', orgId] });
      toast.success('Cadência salva com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao salvar cadência.');
    }
  });

  const deleteCadencia = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cadencias').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cadencias', orgId] });
      toast.success('Cadência excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir cadência.');
    }
  });

  return { cadencias, isLoading, saveCadencia: saveCadencia.mutate, deleteCadencia: deleteCadencia.mutate, isSaving: saveCadencia.isPending };
}

export function useCadenciaLogs(dateRange?: DateRange) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  // Listen to realtime changes in cadencia_logs
  useEffect(() => {
    if (!orgId) return;

    const channel = supabase.channel('cadencia_logs_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'cadencia_logs'
      }, (payload: any) => {
        if (payload.new?.organization_id === orgId) {
          // Recarregar os dados quando um novo log entrar (ex: enviado com sucesso)
          queryClient.invalidateQueries({ queryKey: ['cadencia_logs', orgId] });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, queryClient]);

  return useQuery({
    queryKey: ['cadencia_logs', orgId, dateRange],
    queryFn: async () => {
      if (!user || !orgId) return [];

      let query = supabase
        .from('cadencia_logs')
        .select(`
          *,
          leads:lead_id(nome, telefone),
          cadencias:cadencia_id(nome)
        `)
        .eq('organization_id', orgId)
        .order('enviado_em', { ascending: false });

      if (dateRange?.from) {
        query = query.gte('enviado_em', format(startOfDay(dateRange.from), 'yyyy-MM-dd HH:mm:ss'));
      }
      if (dateRange?.to) {
        query = query.lte('enviado_em', format(endOfDay(dateRange.to), 'yyyy-MM-dd HH:mm:ss'));
      } else if (dateRange?.from) {
        query = query.lte('enviado_em', format(endOfDay(dateRange.from), 'yyyy-MM-dd HH:mm:ss'));
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as any) as CadenciaLog[];
    },
    enabled: !!user && !!orgId,
  });
}

// NOVO: Gerenciamento de cadências ativas por Lead
export function useLeadActiveCadences(leadId: string | undefined) {
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!leadId) return;

    // Inscrição mais robusta: ouvimos as mudanças na tabela e filtramos no callback
    // Isso evita problemas de Replica Identity 'Default' que não envia colunas não-modificadas em filtros
    const channel = supabase.channel(`lead_cadencias_changes_${leadId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lead_cadencias'
      }, (payload: any) => {
        const changedLeadId = payload.new?.lead_id || payload.old?.lead_id;
        if (changedLeadId === leadId) {
          // Recarrega os dados quando um fluxo for atualizado (ex: avançou um passo ou concluiu)
          queryClient.invalidateQueries({ queryKey: ['lead_cadencias', leadId] });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, queryClient]);

  const { data: activeCadences = [], isLoading } = useQuery({
    queryKey: ['lead_cadencias', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from('lead_cadencias')
        .select('*, cadencias:cadencia_id(nome)')
        .eq('lead_id', leadId)
        .eq('status', 'ativo');

      if (error) throw error;
      return data as any[];
    },
    enabled: !!leadId,
  });

  const enrollLead = useMutation({
    mutationFn: async (cadenciaId: string) => {
      if (!orgId || !leadId) throw new Error("Dados ausentes");

      // Usando upsert para evitar erro de constraint unique caso o lead já tenha finalizado essa cadência antes
      const { error } = await supabase.from('lead_cadencias').upsert({
        organization_id: orgId,
        lead_id: leadId,
        cadencia_id: cadenciaId,
        status: 'ativo',
        passo_atual_ordem: 0,
        proxima_execucao: new Date().toISOString() // Executa imediatamente no próximo giro do cron
      }, { onConflict: 'lead_id, cadencia_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead_cadencias', leadId] });
      toast.success("Lead matriculado na cadência. O fluxo iniciará em breve.");
    },
    onError: (error: any) => toast.error(error.message)
  });

  const cancelCadence = useMutation({
    mutationFn: async (leadCadenciaId: string) => {
      const { error } = await supabase
        .from('lead_cadencias')
        .update({ status: 'cancelado', proxima_execucao: null })
        .eq('id', leadCadenciaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead_cadencias', leadId] });
      toast.info("Cadência cancelada.");
    },
    onError: (error: any) => toast.error(error.message)
  });

  return {
    activeCadences,
    isLoading,
    enrollLead: enrollLead.mutate,
    isEnrolling: enrollLead.isPending,
    cancelCadence: cancelCadence.mutate
  };
}