import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export function useClinicSettings() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['clinic_settings', orgId],
    queryFn: async () => {
      if (!user || !orgId) return null;
      
      const { data, error } = await supabase
        .from('configuracoes_clinica')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!orgId,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: any) => {
      if (!user || !orgId) throw new Error("Usuário não autenticado");
      
      if (!settings) {
        // Create if not exists
        const { data, error } = await supabase
          .from('configuracoes_clinica')
          .insert([{ ...updates, usuario_id: user.id, organization_id: orgId }])
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      
      const { data, error } = await supabase
        .from('configuracoes_clinica')
        .update(updates)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic_settings', orgId] });
      toast.success('Configurações da clínica atualizadas!', { closeButton: true });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar configurações', { closeButton: true });
    },
  });

  return { settings, isLoading, updateSettings: updateSettings.mutate };
}