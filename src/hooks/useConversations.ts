import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { Lead } from './useLeads';
import { useProfile } from './useProfile';
import { Tag } from './useTags';

export interface Attachment {
  id: string;
  message_id: string;
  file_path: string;
  file_type: 'imagem' | 'video' | 'audio' | 'pdf' | 'arquivo';
}

export interface Message {
  id: string;
  lead_id: string;
  user_id: string | null;
  conteudo: string;
  direcao: 'entrada' | 'saida';
  remetente: 'lead' | 'agente' | 'bot' | 'agente_crm';
  tipo_conteudo: string;
  criado_em: string;
  media_path: string | null;
  id_mensagem: string | null;
  message_attachments?: Attachment[];
}

export interface Conversation extends Lead {
  last_message_content?: string;
  last_message_timestamp?: string;
  last_message_type?: string;
  last_message_sender?: string;
  tags: Tag[];
}

export function useConversationsList() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const orgId = profile?.organization_id;
  const queryKey = ['conversations', orgId];

  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel('public:list_refresh')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mensagens' }, () => {
        queryClient.invalidateQueries({ queryKey });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orgId, queryClient, queryKey]);

  return useQuery<Conversation[], Error>({
    queryKey,
    queryFn: async () => {
      if (!orgId) return [];

      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select(`*, leads_tags(tags(*))`)
        .eq('organization_id', orgId);

      if (leadsError) throw leadsError;

      const leadIds = leads.map(l => l.id);

      const { data: recentMessages } = await supabase
        .from('mensagens')
        .select('lead_id, conteudo, criado_em, tipo_conteudo, remetente')
        .in('lead_id', leadIds)
        .order('criado_em', { ascending: false });

      const conversations = leads.map((lead: any) => {
        const lastMessage = recentMessages?.find(m => m.lead_id === lead.id);
        const tags = lead.leads_tags?.map((lt: any) => lt.tags).filter(Boolean) || [];

        return {
          ...lead,
          last_message_content: lastMessage?.conteudo || 'Nenhuma mensagem ainda',
          last_message_timestamp: lastMessage?.criado_em || lead.criado_em,
          last_message_type: lastMessage?.tipo_conteudo || 'texto',
          last_message_sender: lastMessage?.remetente,
          tags: tags,
        };
      });

      return conversations.sort((a, b) =>
        new Date(b.last_message_timestamp!).getTime() - new Date(a.last_message_timestamp!).getTime()
      );
    },
    enabled: !!orgId,
    staleTime: 5000,
  });
}

export function useMessages(leadId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['messages_v6', leadId];

  useEffect(() => {
    if (!leadId || !user) return;

    const channel = supabase.channel(`chat_realtime_${leadId}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens'
        },
        (payload) => {
          const newMessage = payload.new as Message;
          if (newMessage.lead_id !== leadId) return;

          queryClient.setQueryData<Message[]>(queryKey, (old) => {
            if (!old) return [newMessage];
            // Remove duplicatas de mensagens otimistas
            const filtered = old.filter(m =>
              !(m.id.startsWith('temp-') && m.conteudo === newMessage.conteudo && m.remetente === newMessage.remetente)
            );
            if (filtered.some(m => m.id === newMessage.id)) return filtered;
            return [...filtered, newMessage];
          });

          // Invalida para carregar anexos ou dados extras que o realtime não traz
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .on('postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'mensagens'
        },
        (payload) => {
          if (payload.old?.lead_id !== leadId && !activeMessagesContains(payload.old.id)) return;

          queryClient.setQueryData<Message[]>(queryKey, (old) =>
            old ? old.filter(m => m.id !== payload.old.id) : []
          );
        }
      )
      .subscribe();

    // Helper p/ delete (opcional, mas garante consistência se lead_id não vier no delete)
    function activeMessagesContains(id: string) {
      const msgs = queryClient.getQueryData<Message[]>(queryKey);
      return msgs?.some(m => m.id === id);
    }

    return () => { supabase.removeChannel(channel); };
  }, [leadId, user, queryClient, queryKey]);

  return useQuery<Message[], Error>({
    queryKey,
    queryFn: async () => {
      if (!leadId || !user) return [];

      const { data, error } = await supabase
        .from('mensagens')
        .select(`
          *,
          message_attachments (*)
        `)
        .eq('lead_id', leadId)
        .order('criado_em', { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!leadId && !!user,
  });
}

export function useSendMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, content }: { leadId: string; content: string }) => {
      const { data: insertedMsg, error: dbError } = await supabase
        .from('mensagens')
        .insert({
          lead_id: leadId,
          user_id: user?.id,
          conteudo: content,
          direcao: 'saida',
          remetente: 'agente',
          tipo_conteudo: 'texto'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      const { data: lead } = await supabase.from('leads').select('telefone').eq('id', leadId).single();

      await fetch('https://webhook.orbevision.shop/webhook/mensagens-crm-vrconcept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          mensagem: content,
          url_midia: null,
          tipo: 'texto',
          titulo_pdf: null,
          // Metadados extras úteis:
          telefone: lead?.telefone,
          user_id: user?.id,
          internal_msg_id: insertedMsg.id
        }),
      });

      return insertedMsg;
    },
    onMutate: async ({ leadId, content }) => {
      const queryKey = ['messages_v6', leadId];
      await queryClient.cancelQueries({ queryKey });

      const previousMessages = queryClient.getQueryData<Message[]>(queryKey);
      const tempId = `temp-${Date.now()}`;

      const optimisticMessage: Message = {
        id: tempId,
        lead_id: leadId,
        user_id: user?.id || null,
        conteudo: content,
        direcao: 'saida',
        remetente: 'agente',
        tipo_conteudo: 'texto',
        criado_em: new Date().toISOString(),
        media_path: null,
        id_mensagem: null,
        message_attachments: []
      };

      queryClient.setQueryData<Message[]>(queryKey, (old) =>
        old ? [...old, optimisticMessage] : [optimisticMessage]
      );

      return { previousMessages };
    },
    onError: (err, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages_v6', variables.leadId], context.previousMessages);
      }
      toast.error('Erro ao enviar mensagem.');
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages_v6', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });
}

export function useSendAttachments() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, files }: { leadId: string; files: { file: File; caption: string }[] }) => {
      const { data: lead } = await supabase.from('leads').select('telefone').eq('id', leadId).single();
      if (!lead) throw new Error("Lead não encontrado");

      const orgId = profile?.organization_id;
      const results = [];

      for (const item of files) {
        const file = item.file;
        const caption = item.caption;

        // 1. Upload Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${orgId}/${leadId}/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('media-mensagens').upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('media-mensagens').getPublicUrl(filePath);

        // 2. Determina tipo
        let mediaType: 'imagem' | 'video' | 'pdf' | 'arquivo' = 'arquivo';
        if (file.type.startsWith('image/')) mediaType = 'imagem';
        else if (file.type.startsWith('video/')) mediaType = 'video';
        else if (file.type === 'application/pdf') mediaType = 'pdf';

        // 3. Registro no Banco
        const { data: message, error: msgError } = await supabase
          .from('mensagens')
          .insert({
            lead_id: leadId,
            user_id: user?.id,
            conteudo: caption,
            direcao: 'saida',
            remetente: 'agente',
            tipo_conteudo: mediaType,
            media_path: filePath
          })
          .select()
          .single();

        if (msgError) throw msgError;

        await supabase.from('message_attachments').insert({
          message_id: message.id,
          file_path: filePath,
          file_type: mediaType as any
        });

        // 4. Disparo Webhook Individual com parâmetros solicitados
        await fetch('https://webhook.orbevision.shop/webhook/mensagens-crm-vrconcept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: leadId,
            mensagem: caption || '',
            url_midia: publicUrl,
            tipo: mediaType,
            titulo_pdf: mediaType === 'pdf' ? file.name : null,
            // Metadados:
            telefone: lead.telefone,
            user_id: user?.id,
            internal_msg_id: message.id
          }),
        });

        results.push(message);
      }
      return results;
    },
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ['messages_v6', leadId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success("Anexos enviados com sucesso!");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Erro ao enviar anexos.");
    }
  });
}

export function useSendAudioMessage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, audioBlob }: { leadId: string; audioBlob: Blob }) => {
      const filePath = `${profile?.organization_id}/${leadId}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage.from('media-mensagens').upload(filePath, audioBlob);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('media-mensagens').getPublicUrl(filePath);

      const { data: message, error: msgError } = await supabase
        .from('mensagens')
        .insert({
          lead_id: leadId,
          user_id: user?.id,
          conteudo: '',
          direcao: 'saida',
          remetente: 'agente',
          tipo_conteudo: 'audio',
          media_path: filePath
        })
        .select()
        .single();

      if (msgError) throw msgError;

      await supabase.from('message_attachments').insert({
        message_id: message.id,
        file_path: filePath,
        file_type: 'audio'
      });

      const { data: lead } = await supabase.from('leads').select('telefone').eq('id', leadId).single();

      await fetch('https://webhook.orbevision.shop/webhook/mensagens-crm-vrconcept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          mensagem: '',
          url_midia: publicUrl,
          tipo: 'audio',
          titulo_pdf: null,
          // Metadados:
          telefone: lead?.telefone,
          user_id: user?.id,
          internal_msg_id: message.id
        }),
      });

      return message;
    },
    onMutate: async ({ leadId, audioBlob }) => {
      const queryKey = ['messages_v6', leadId];
      await queryClient.cancelQueries({ queryKey });

      const previousMessages = queryClient.getQueryData<Message[]>(queryKey);
      const tempId = `temp-audio-${Date.now()}`;
      const audioUrl = URL.createObjectURL(audioBlob);

      const optimisticMessage: Message = {
        id: tempId,
        lead_id: leadId,
        user_id: user?.id || null,
        conteudo: '',
        direcao: 'saida',
        remetente: 'agente',
        tipo_conteudo: 'audio',
        criado_em: new Date().toISOString(),
        media_path: audioUrl,
        id_mensagem: null,
        message_attachments: [{
          id: `att-${tempId}`,
          message_id: tempId,
          file_path: audioUrl,
          file_type: 'audio'
        }]
      };

      queryClient.setQueryData<Message[]>(queryKey, (old) =>
        old ? [...old, optimisticMessage] : [optimisticMessage]
      );

      return { previousMessages };
    },
    onError: (err, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages_v6', variables.leadId], context.previousMessages);
      }
      toast.error('Erro ao enviar áudio.');
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages_v6', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, leadId, id_mensagem }: { messageId: string; leadId: string; id_mensagem: string | null }) => {
      await supabase.functions.invoke('delete-message', { body: { messageId, leadId, id_mensagem } });
      return messageId;
    },
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ['messages_v6', leadId] });
    }
  });
}