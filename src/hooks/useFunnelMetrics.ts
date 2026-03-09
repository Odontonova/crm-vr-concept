import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { DateRange } from 'react-day-picker';
import { startOfDay, endOfDay } from 'date-fns';

export interface FunnelStep {
  stageId: number | null;
  stageName: string;
  stageOrder: number;
  color: string;
  count: number;
  dropoffCount: number;
  conversionToNext: number;
  conversionFromStart: number;
}

export function useFunnelMetrics(dateRange: DateRange | undefined, origin: 'marketing' | 'organico' = 'marketing') {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ['funnel-metrics', orgId, dateRange, origin],
    queryFn: async () => {
      if (!user || !orgId || !dateRange?.from) return [];

      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = dateRange.to
        ? endOfDay(dateRange.to).toISOString()
        : endOfDay(dateRange.from).toISOString();

      // 1. Buscar leads e etapas marcadas para o funil
      const [
        { data: leads, error: leadsError },
        { data: allStages, error: stagesError }
      ] = await Promise.all([
        supabase.from('leads').select('posicao_pipeline').eq('organization_id', orgId).eq('origem', origin).gte('criado_em', startDate).lte('criado_em', endDate),
        supabase.from('etapas').select('*').order('posicao_ordem', { ascending: true })
      ]);

      if (leadsError) throw leadsError;
      if (stagesError) throw stagesError;

      const leadsList = (leads || []) as any[];
      const funnelStages = (allStages || []).filter((s: any) => s.em_funil !== false);

      if (funnelStages.length === 0) return [];

      // 2. Mapear as posições das etapas do funil
      const orderedFunnelPositions = funnelStages.map((s: any) => s.posicao_ordem);

      // 3. Construir o Funil com volume acumulado
      const funnelData: FunnelStep[] = funnelStages.map((stage: any, idx: number) => {
        // Conta leads que estão nesta etapa ou em QUALQUER etapa do funil POSTERIOR
        const subsequentPositions = orderedFunnelPositions.slice(idx);
        const count = leadsList.filter(l => subsequentPositions.includes(l.posicao_pipeline)).length;

        return {
          stageId: stage.id,
          stageName: stage.nome,
          stageOrder: stage.posicao_ordem,
          color: stage.cor || "#cbd5e1",
          count: count,
          dropoffCount: 0,
          conversionToNext: 0,
          conversionFromStart: 0
        };
      });

      // 4. Calcular Taxas
      const totalLeads = funnelData[0]?.count || 0;
      for (let i = 0; i < funnelData.length; i++) {
        const current = funnelData[i];
        const next = funnelData[i + 1];
        current.conversionFromStart = totalLeads > 0 ? (current.count / totalLeads) * 100 : 0;
        if (next) {
          current.conversionToNext = current.count > 0 ? (next.count / current.count) * 100 : 0;
          current.dropoffCount = Math.max(0, current.count - next.count);
        }
      }

      return funnelData;
    },
    enabled: !!user && !!orgId && !!dateRange?.from,
  });
}