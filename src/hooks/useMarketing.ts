import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { toast } from 'sonner';
import { DateRange } from 'react-day-picker';
import { startOfDay, endOfDay, format } from 'date-fns';
import { useEffect } from 'react';

export interface MetaMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  reach: number;
  results: number;
  cost_per_result: number;
  reporting_start?: string | null;
  reporting_end?: string | null;
  updated_at?: string;
  included_in_dashboard?: boolean;
}

export interface Criativo {
  id: string;
  organization_id: string;
  nome: string | null;
  titulo: string | null;
  conteudo: string | null;
  url_midia: string | null;
  url_thumbnail: string | null;
  plataforma: string | null;
  aplicativo: string | null;
  criado_em: string;
  platform_metrics?: MetaMetrics;
  stats?: {
    contagem_leads: number;
    contagem_vendas: number;
    faturamento: number;
  };
}

export function useMarketing(dateRange?: DateRange) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  const resolveMediaUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('media-mensagens').getPublicUrl(path);
    return data.publicUrl;
  };

  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel('marketing_realtime_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'criativos' }, () => {
        queryClient.invalidateQueries({ queryKey: ['marketing_metrics'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        queryClient.invalidateQueries({ queryKey: ['marketing_metrics'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, () => {
        queryClient.invalidateQueries({ queryKey: ['marketing_metrics'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, queryClient]);

  const { data: metricsData, isLoading } = useQuery({
    queryKey: ['marketing_metrics', orgId, dateRange],
    queryFn: async () => {
      if (!user || !orgId) return { criativos: [], manualSpend: 0, totalSales: 0 };

      // Definição do intervalo de datas
      const startDate = dateRange?.from ? startOfDay(dateRange.from).toISOString() : null;
      const endDate = dateRange?.to ? endOfDay(dateRange.to).toISOString() : (dateRange?.from ? endOfDay(dateRange.from).toISOString() : null);
      
      const startDayStr = dateRange?.from ? format(startOfDay(dateRange.from), 'yyyy-MM-dd') : null;
      const endDayStr = dateRange?.to ? format(endOfDay(dateRange.to), 'yyyy-MM-dd') : (dateRange?.from ? format(endOfDay(dateRange.from), 'yyyy-MM-dd') : null);

      // 1. Busca todos os criativos (sempre aparecem na lista)
      const { data: criativosRaw, error: criativosError } = await supabase
        .from('criativos')
        .select('*')
        .eq('organization_id', orgId)
        .order('criado_em', { ascending: false });

      if (criativosError) throw criativosError;

      // 2. Busca Leads do período para as estatísticas
      let leadsQuery = supabase.from('leads').select('id, criativo_id').eq('organization_id', orgId);
      if (startDate && endDate) {
        leadsQuery = leadsQuery.gte('criado_em', startDate).lte('criado_em', endDate);
      }
      const { data: leadsInPeriod } = await leadsQuery;

      // 3. Busca Vendas do período (join com leads para saber o criativo)
      let vendasQuery = supabase.from('vendas').select('valor_fechado, leads(criativo_id)').eq('organization_id', orgId);
      if (startDayStr && endDayStr) {
        vendasQuery = vendasQuery.gte('data_fechamento', startDayStr).lte('data_fechamento', endDayStr);
      }
      const { data: vendasInPeriod } = await vendasQuery;

      // 4. Busca Gastos Manuais para o Investimento Total
      let expensesQuery = supabase.from('marketing_expenses').select('amount').eq('organization_id', orgId);
      if (startDayStr && endDayStr) {
        expensesQuery = expensesQuery.gte('expense_date', startDayStr).lte('expense_date', endDayStr);
      }
      const { data: expenses } = await expensesQuery;

      // Processamento das métricas em memória para performance
      const manualSpend = expenses?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      const totalSalesCount = vendasInPeriod?.length || 0;

      const criativosComStats = (criativosRaw || []).map((item) => {
        const leadsForThisCreative = (leadsInPeriod || []).filter(l => l.criativo_id === item.id).length;
        const salesForThisCreative = (vendasInPeriod || []).filter(v => (v.leads as any)?.criativo_id === item.id);
        
        return {
          ...item,
          url_thumbnail: resolveMediaUrl(item.url_thumbnail),
          url_midia: resolveMediaUrl(item.url_midia),
          stats: {
            contagem_leads: leadsForThisCreative,
            contagem_vendas: salesForThisCreative.length,
            faturamento: salesForThisCreative.reduce((acc, v) => acc + Number(v.valor_fechado), 0)
          }
        };
      });

      return {
        criativos: criativosComStats as Criativo[],
        manualSpend,
        totalSales: totalSalesCount
      };
    },
    enabled: !!user && !!orgId,
  });

  const atualizarNomeCriativo = useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const { error } = await supabase.from('criativos').update({ nome }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marketing_metrics'] }),
  });

  const deletarCriativo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('criativos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marketing_metrics'] }),
  });

  const atualizarMetricasCriativo = useMutation({
    mutationFn: async ({ id, metrics }: { id: string; metrics: MetaMetrics }) => {
      const { error } = await supabase.from('criativos').update({ platform_metrics: metrics }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marketing_metrics'] }),
  });

  const associarCriativo = useMutation({
    mutationFn: async ({ campaignId, creativeId }: { campaignId: string; creativeId: string }) => {
      const { data: targetCreative } = await supabase.from('criativos').select('url_thumbnail, url_midia, conteudo').eq('id', creativeId).single();
      if (!targetCreative) throw new Error("Criativo não encontrado");
      const { error } = await supabase.from('criativos').update({
        url_thumbnail: targetCreative.url_thumbnail,
        url_midia: targetCreative.url_midia,
        conteudo: targetCreative.conteudo
      }).eq('id', campaignId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marketing_metrics'] }),
  });

  const adicionarInvestimentoManual = useMutation({
    mutationFn: async (data: { amount: number; date: Date; description: string }) => {
      if (!orgId) throw new Error("Organização não encontrada");
      const { error } = await supabase.from('marketing_expenses').insert({
        organization_id: orgId,
        amount: data.amount,
        expense_date: format(data.date, 'yyyy-MM-dd'),
        description: data.description
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing_metrics'] });
      toast.success("Investimento registrado com sucesso!");
    },
  });

  const toggleAdSpendInclusion = useMutation({
    mutationFn: async ({ id, included }: { id: string; included: boolean }) => {
      const { data: criativo } = await supabase.from('criativos').select('platform_metrics').eq('id', id).single();
      const updatedMetrics = { ...(criativo?.platform_metrics as any || {}), included_in_dashboard: included };
      const { error } = await supabase.from('criativos').update({ platform_metrics: updatedMetrics }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marketing_metrics'] }),
  });

  return {
    criativos: metricsData?.criativos || [],
    isLoading,
    atualizarNomeCriativo: atualizarNomeCriativo.mutate,
    deletarCriativo: deletarCriativo.mutate,
    atualizarMetricasCriativo: atualizarMetricasCriativo.mutateAsync,
    associarCriativo: associarCriativo.mutate,
    adicionarInvestimentoManual: adicionarInvestimentoManual.mutate,
    toggleAdSpendInclusion: toggleAdSpendInclusion.mutate,
    manualSpend: metricsData?.manualSpend || 0,
    totalSales: metricsData?.totalSales || 0
  };
}