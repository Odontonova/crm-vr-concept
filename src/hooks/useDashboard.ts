import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { DateRange } from 'react-day-picker';
import { format, startOfDay, eachDayOfInterval, parseISO, endOfDay } from 'date-fns';
import { useEffect } from 'react';

export function useDashboard(dateRange: DateRange | undefined) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel('dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketing_expenses' }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'criativos' }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, queryClient]);

  const { data: metrics, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-metrics', orgId, dateRange],
    queryFn: async () => {
      if (!user || !orgId || !dateRange?.from || !dateRange?.to) return null;

      // PADRONIZAÇÃO: Uso de toISOString para evitar conflitos de fuso GMT-3
      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = endOfDay(dateRange.to).toISOString();

      const [
        { data: leadsData },
        { data: stagesData },
        { data: activitiesData },
        { data: vendasData },
        { data: expensesData },
        { data: criativosData }
      ] = await Promise.all([
        supabase.from('leads').select('*').eq('organization_id', orgId).gte('criado_em', startDate).lte('criado_em', endDate),
        supabase.from('etapas').select('id, nome, posicao_ordem'),
        supabase.from('atividades').select('*').eq('organization_id', orgId).gte('criado_em', startDate).lte('criado_em', endDate).limit(10),
        supabase.from('vendas').select('valor_fechado, data_fechamento').eq('organization_id', orgId).gte('data_fechamento', format(dateRange.from, 'yyyy-MM-dd')).lte('data_fechamento', format(dateRange.to, 'yyyy-MM-dd')),
        supabase.from('marketing_expenses').select('amount').eq('organization_id', orgId).gte('expense_date', format(dateRange.from, 'yyyy-MM-dd')).lte('expense_date', format(dateRange.to, 'yyyy-MM-dd')),
        supabase.from('criativos').select('platform_metrics').eq('organization_id', orgId)
      ]);

      const leads = (leadsData || []) as any[];
      const stages = (stagesData || []) as any[];
      const vendas = (vendasData || []) as any[];
      const expenses = (expensesData || []) as any[];
      const criativos = (criativosData || []) as any[];

      // Encontra a última etapa do funil (conversão)
      const funnelStages = stages.filter(s => s.em_funil !== false).sort((a, b) => a.posicao_ordem - b.posicao_ordem);
      const conversionGoalStage = funnelStages[funnelStages.length - 1];
      const funnelStartStage = funnelStages[0];

      const convertedPosition = conversionGoalStage?.posicao_ordem || 999;
      const startPosition = funnelStartStage?.posicao_ordem || 0;

      const totalContatos = leads.length;

      // Leads que entraram no funil (estão na primeira etapa ou além)
      const leadsInFunnel = leads.filter(l => {
        // Encontra a posição da etapa do lead
        const leadStage = stages.find(s => s.posicao_ordem === l.posicao_pipeline);
        return l.posicao_pipeline >= startPosition;
      }).length;

      const convertedLeads = leads.filter(l => l.posicao_pipeline >= convertedPosition).length;
      const conversionRate = leadsInFunnel > 0 ? (convertedLeads / leadsInFunnel) * 100 : 0;

      const marketingLeads = leads.filter(l => l.origem === 'marketing').length;
      const organicLeads = leads.filter(l => l.origem === 'organico').length;

      const faturamentoTotal = vendas.reduce((sum: number, v: any) => sum + v.valor_fechado, 0);
      const totalVendasCount = vendas.length || 0;

      const manualSpend = expenses.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0) || 0;
      const metaSpend = criativos.reduce((acc: number, curr: any) => {
        const metrics = curr.platform_metrics as any;
        if (metrics && metrics.included_in_dashboard && metrics.spend) {
          return acc + Number(metrics.spend);
        }
        return acc;
      }, 0) || 0;

      const totalInvestment = manualSpend + metaSpend;
      const cac = totalVendasCount > 0 ? totalInvestment / totalVendasCount : 0;

      const daysInInterval = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      const leadsOverTime = daysInInterval.map(day => {
        const dStart = startOfDay(day);
        const dEnd = endOfDay(day);

        return {
          day: format(day, 'dd/MM'),
          captados: leads.filter(l => {
            const d = parseISO(l.criado_em);
            return d >= dStart && d <= dEnd;
          }).length,
          convertidos: leads.filter(l => {
            if (l.posicao_pipeline < convertedPosition || !l.atualizado_em) return false;
            const d = parseISO(l.atualizado_em);
            return d >= dStart && d <= dEnd;
          }).length
        };
      });

      return {
        totalContatos,
        marketingLeads,
        organicLeads,
        conversionRate: conversionRate.toFixed(1),
        faturamentoTotal,
        cac,
        activities: activitiesData || [],
        leadsByStage: leads.map(l => ({ etapa_id: l.posicao_pipeline })),
        leadsOverTime,
        sourceChartData: [],
      };
    },
    enabled: !!user && !!orgId && !!dateRange?.from && !!dateRange?.to,
  });

  return { metrics, isLoading, error, refetch };
}