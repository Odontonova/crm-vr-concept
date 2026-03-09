import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  user_id: string;
  lead_id: string;
  mensagem: string;
  status: 'pendente' | 'resolvido';
  criado_em: string;
}

export function useNotifications(leadId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['notifications', leadId];

  useEffect(() => {
    if (!leadId || !user) return;

    const channel = supabase
      .channel(`notifications:${leadId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notificacoes', filter: `lead_id=eq.${leadId}` },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, user, queryClient, queryKey]);

  return useQuery<Notification[], Error>({
    queryKey,
    queryFn: async () => {
      if (!leadId || !user) return [];
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('lead_id', leadId)
        .eq('status', 'pendente')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!leadId && !!user,
  });
}

export function useUpdateNotificationStatus(leadId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ['notifications', leadId];

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await supabase
        .from('notificacoes')
        .update({ status: 'resolvido' })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (notificationId: string) => {
      if (!leadId) return;

      await queryClient.cancelQueries({ queryKey });

      const previousNotifications = queryClient.getQueryData<Notification[]>(queryKey);

      if (previousNotifications) {
        const updatedNotifications = previousNotifications.filter(
          (notification) => notification.id !== notificationId
        );
        queryClient.setQueryData(queryKey, updatedNotifications);
      }

      return { previousNotifications };
    },
    onError: (err: any, variables, context: any) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(queryKey, context.previousNotifications);
      }
      toast.error('Erro ao atualizar notificação:', { description: err.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}