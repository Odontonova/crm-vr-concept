import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface InternalAiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  cadencia_gerada_id?: string | null;
  criado_em: string;
  cadencias?: { nome: string } | null;
}

export function useInternalAiChat(leadId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['internal_ai_chat', leadId];

  useEffect(() => {
    if (!leadId) return;

    const channel = supabase.channel(`internal_ai_${leadId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'internal_ai_chat_messages', filter: `lead_id=eq.${leadId}` },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [leadId, queryClient, queryKey]);

  const { data: messages = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!leadId || !user) return [];
      const { data, error } = await supabase
        .from('internal_ai_chat_messages')
        .select('*, cadencias(nome)')
        .eq('lead_id', leadId)
        .order('criado_em', { ascending: true });

      if (error) throw error;
      return data as InternalAiMessage[];
    },
    enabled: !!leadId && !!user,
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const { data, error } = await supabase.functions.invoke('internal-ai-agent', {
        body: { lead_id: leadId, message: content }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey });
      const previousMessages = queryClient.getQueryData<InternalAiMessage[]>(queryKey);
      
      const optimisticMsg: InternalAiMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content,
        criado_em: new Date().toISOString()
      };

      queryClient.setQueryData<InternalAiMessage[]>(queryKey, old => old ? [...old, optimisticMsg] : [optimisticMsg]);
      return { previousMessages };
    },
    onError: (err, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(queryKey, context.previousMessages);
      }
      toast.error('Erro ao comunicar com a IA.', { description: err.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  return {
    messages,
    isLoading,
    sendMessage: sendMessage.mutate,
    isSending: sendMessage.isPending
  };
}