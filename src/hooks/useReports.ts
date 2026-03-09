import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { differenceInDays, eachDayOfInterval, startOfDay, endOfDay, format } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface ReportFilters {
  posicao_pipeline: string;
  origem: string;
  genero: string;
  idade: string;
  tagId: string;
}

const SALES_FUNNEL_STAGES = [
  { name: "Novo Lead", order: 1 },
  { name: "Qualificação", order: 2 },
  { name: "Coletando Informações", order: 3 },
  { name: "Agendamento Solicitado", order: 4 },
  { name: "Agendado", order: 5 },
  { name: "Procedimento Fechado", order: 6 }
];

export function useReports(dateRange: DateRange | undefined, filters: ReportFilters) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ['reports', orgId, dateRange, filters],
    queryFn: async () => {
      if (!user || !orgId || !dateRange?.from) return null;

      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = dateRange.to ? endOfDay(dateRange.to).toISOString() : endOfDay(dateRange.from).toISOString();
      const safeEnd = dateRange.to || dateRange.from;
      const daysInInterval = eachDayOfInterval({ start: dateRange.from, end: safeEnd });

      // 1. Queries
      let leadsQuery = supabase.from('leads').select('*').eq('organization_id', orgId).gte('criado_em', startDate).lte('criado_em', endDate);
      if (filters.origem !== "Todos") leadsQuery = leadsQuery.eq('origem', filters.origem);

      const [
        { data: leads },
        { data: stages },
        { data: vendas },
        { data: criativos }
      ] = await Promise.all([
        leadsQuery,
        supabase.from('etapas').select('*') as any,
        supabase.from('vendas').select('*, leads(id, nome, telefone, origem, criativo_id)').eq('organization_id', orgId) as any,
        supabase.from('criativos').select('id, nome, titulo').eq('organization_id', orgId) as any
      ]);

      const leadsList: any[] = leads || [];
      const stagesList: any[] = (stages as any) || [];
      const criativosMap = new Map(((criativos || []) as any[]).map(c => [c.id, c]));

      const funnelStages = stagesList.filter(s => s.em_funil !== false).sort((a, b) => a.posicao_ordem - b.posicao_ordem);
      const funnelPositions = funnelStages.map(s => s.posicao_ordem);

      // 3. Funil Dinâmico
      const funnelData = funnelStages.map((stage, idx) => {
        const subsequentPositions = funnelPositions.slice(idx);
        const volume = leadsList.filter(l => subsequentPositions.includes(l.posicao_pipeline)).length;

        let conversionRate = 100;
        if (idx > 0) {
          const prevSubsequent = funnelPositions.slice(idx - 1);
          const prevVolume = leadsList.filter(l => prevSubsequent.includes(l.posicao_pipeline)).length;
          conversionRate = prevVolume > 0 ? (volume / prevVolume) * 100 : 0;
        }

        return {
          etapa: stage.nome,
          quantidade: volume,
          conversionRate: conversionRate.toFixed(1),
          dropOffRate: (100 - conversionRate).toFixed(1),
          fill: stage.cor || '#cbd5e1'
        };
      });

      // 4. KPIs e outros dados
      const conversionGoalStage = funnelStages[funnelStages.length - 1];
      const convertedPos = conversionGoalStage?.posicao_ordem || 999;
      const convertedLeads = leadsList.filter(l => l.posicao_pipeline >= convertedPos);

      const totalFaturado = (vendas || []).reduce((sum: number, v: any) => sum + Number(v.valor_fechado), 0);

      return {
        kpis: {
          totalLeads: leadsList.length,
          totalContatos: leadsList.length,
          totalNovosLeads: leadsList.length,
          conversionRate: leadsList.length > 0 ? ((convertedLeads.length / leadsList.length) * 100).toFixed(1) : "0",
          ticketMedio: convertedLeads.length > 0 ? totalFaturado / convertedLeads.length : 0,
          tempoMedioFunil: "0"
        },
        charts: {
          leadsCapturedData: daysInInterval.map(d => ({ day: format(d, 'dd/MM'), captados: 0, convertidos: 0 })),
          sourceData: [],
          topCreativesData: []
        },
        funnel: {
          funnelData,
          overallConversion: funnelData.length > 0 && funnelData[0].quantidade > 0
            ? ((funnelData[funnelData.length - 1].quantidade / funnelData[0].quantidade) * 100).toFixed(1)
            : "0",
          detailedSteps: funnelData
        },
        financial: {
          totalFaturado,
          ticketMedio: 0,
          totalVendas: (vendas || []).length,
          taxaEficiencia: 0,
          faturamentoPorDia: [],
          metodosPagamentoData: []
        },
        conversions: {
          charts: {
            conversoesPorOrigemData: [],
            valorConvertidoPorDia: []
          }
        }
      };
    },
    enabled: !!user && !!orgId && !!dateRange?.from,
  });
}