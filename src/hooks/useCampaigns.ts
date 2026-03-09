import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { DateRange } from 'react-day-picker';
import { format, startOfDay } from 'date-fns';
import { useProfile } from './useProfile';

export interface Campaign {
  id: string;
  usuario_id: string;
  organization_id?: string;
  nome: string;
  descricao?: string;
  status: string;
  segmento?: string;
  segmento_config?: any;
  template_mensagem: string;
  data_agendamento?: string;
  intervalo_segundos: number;
  contagem_destinatarios: number;
  contagem_enviados: number;
  contagem_visualizados: number;
  contagem_respostas: number;
  contagem_conversoes: number;
  criado_em: string;
  atualizado_em: string;
  targeted_lead_ids?: string[];
  media_url?: string | null;
}

export function useCampaigns(dateRange?: DateRange) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const orgId = profile?.organization_id;

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns', orgId, dateRange],
    queryFn: async () => {
      if (!user || !orgId) return [];
      
      let query = supabase
        .from('campanhas')
        .select('*')
        .eq('organization_id', orgId)
        .order('criado_em', { ascending: false });

      if (dateRange?.from && dateRange?.to) {
        const startDate = format(startOfDay(dateRange.from), 'yyyy-MM-dd HH:mm:ss');
        const endDate = format(startOfDay(dateRange.to), 'yyyy-MM-dd HH:mm:ss');
        query = query.gte('criado_em', startDate).lte('criado_em', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Campaign[];
    },
    enabled: !!user && !!orgId,
  });

  const createCampaign = useMutation({
    mutationFn: async (campaign: Omit<Campaign, 'id' | 'usuario_id' | 'organization_id' | 'criado_em' | 'atualizado_em' | 'contagem_enviados' | 'contagem_visualizados' | 'contagem_respostas' | 'contagem_conversoes'>) => {
      if (!user || !orgId) throw new Error("Usuário não autenticado");
      
      const { data, error } = await supabase
        .from('campanhas')
        .insert([{ ...campaign, usuario_id: user.id, organization_id: orgId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', orgId] });
      toast.success('Campanha criada com sucesso!', { closeButton: true });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar campanha', { closeButton: true });
    },
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Campaign> & { id: string }) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase.from('campanhas').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', orgId] });
      toast.success('Campanha atualizada com sucesso!', { closeButton: true });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar campanha', { closeButton: true });
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { error } = await supabase.from('campanhas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', orgId] });
      toast.success('Campanha excluída com sucesso!', { closeButton: true });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir campanha', { closeButton: true });
    },
  });

  return {
    campaigns,
    isLoading,
    createCampaign: createCampaign.mutate,
    updateCampaign: updateCampaign.mutate,
    deleteCampaign: deleteCampaign.mutate,
  };
}