import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { toast } from 'sonner';
import { Message } from './useConversations';

export interface QuickMessage {
  id: string;
  organization_id: string;
  titulo: string;
  conteudo: string | null;
  tipo: 'texto' | 'audio' | 'imagem' | 'video' | 'pdf';
  arquivo_path: string | null;
  criado_em: string;
  folder_id?: string | null;
  position: number;
}

const WEBHOOK_URL = 'https://webhook.orbevision.shop/webhook/botoes-crm-vrconcept';

export function useQuickMessages() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  const { data: quickMessages = [], isLoading } = useQuery({
    queryKey: ['quick_messages', orgId],
    queryFn: async () => {
      if (!user || !orgId) return [];

      const { data, error } = await supabase
        .from('mensagens_rapidas')
        .select('*')
        .eq('organization_id', orgId)
        .order('position', { ascending: true })
        .order('titulo', { ascending: true });

      if (error) throw error;
      return data as QuickMessage[];
    },
    enabled: !!user && !!orgId,
  });

  const createQuickMessage = useMutation({
    mutationFn: async ({
      titulo,
      conteudo,
      tipo,
      file,
      folder_id
    }: {
      titulo: string;
      conteudo: string;
      tipo: string;
      file?: File | null;
      folder_id?: string | null;
    }) => {
      if (!user || !orgId) throw new Error("Usuário não autenticado");

      let arquivo_path = null;

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${orgId}/quick-messages/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('media-mensagens')
          .upload(filePath, file);

        if (uploadError) throw uploadError;
        arquivo_path = filePath;
      }

      let query = supabase
        .from('mensagens_rapidas')
        .select('position')
        .eq('organization_id', orgId)
        .order('position', { ascending: false })
        .limit(1);

      if (folder_id) {
        query = query.eq('folder_id', folder_id);
      } else {
        query = query.is('folder_id', null);
      }

      const { data: maxPosData } = await query.single();
      const nextPos = (maxPosData?.position || 0) + 1;

      const { data, error } = await supabase
        .from('mensagens_rapidas')
        .insert([{
          titulo,
          conteudo: conteudo || '',
          tipo,
          arquivo_path,
          organization_id: orgId,
          folder_id: folder_id || null,
          position: nextPos
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick_messages', orgId] });
      toast.success('Mensagem rápida criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar mensagem: ${error.message}`);
    },
  });

  const updateQuickMessage = useMutation({
    mutationFn: async ({
      id,
      titulo,
      conteudo,
      tipo,
      file,
      folder_id
    }: {
      id: string;
      titulo: string;
      conteudo: string;
      tipo: string;
      file?: File | null;
      folder_id?: string | null;
    }) => {
      if (!user || !orgId) throw new Error("Usuário não autenticado");

      let updates: any = {
        titulo,
        conteudo: conteudo || '',
        tipo,
        folder_id: folder_id || null
      };

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${orgId}/quick-messages/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('media-mensagens')
          .upload(filePath, file);

        if (uploadError) throw uploadError;
        updates.arquivo_path = filePath;
      }

      const { data, error } = await supabase
        .from('mensagens_rapidas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick_messages', orgId] });
      toast.success('Mensagem atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar mensagem: ${error.message}`);
    },
  });

  const deleteQuickMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mensagens_rapidas')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick_messages', orgId] });
      toast.success('Mensagem excluída.');
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  const sendQuickMessage = useMutation({
    mutationFn: async ({ message, leadId, phone }: { message: QuickMessage; leadId: string; phone: string }) => {
      if (!user) throw new Error("Usuário não autenticado");

      let url_midia = null;

      if (message.arquivo_path) {
        const { data } = supabase.storage
          .from('media-mensagens')
          .getPublicUrl(message.arquivo_path);

        url_midia = data.publicUrl;
      }

      // 1. REGISTRO DIRETO NO BANCO
      const { data: insertedMsg, error: dbError } = await supabase
        .from('mensagens')
        .insert({
          lead_id: leadId,
          user_id: user.id,
          conteudo: message.conteudo || '',
          direcao: 'saida',
          remetente: 'bot',
          tipo_conteudo: message.tipo,
          media_path: message.arquivo_path
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 2. REGISTRO ANEXO SE HOUVER
      if (message.arquivo_path) {
        await supabase.from('message_attachments').insert({
          message_id: insertedMsg.id,
          file_path: message.arquivo_path,
          file_type: (message.tipo === 'pdf' ? 'pdf' : message.tipo) as any
        });
      }

      // 3. DISPARO WEBHOOK COM PARÂMETROS PADRONIZADOS
      const payload = {
        lead_id: leadId,
        mensagem: message.conteudo || '',
        url_midia: url_midia,
        tipo: message.tipo,
        titulo_pdf: message.tipo === 'pdf' ? message.titulo : null,
        // Metadados extras:
        telefone: phone,
        user_id: user.id,
        remetente: 'bot',
        internal_msg_id: insertedMsg.id
      };

      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      return insertedMsg;
    },
    onMutate: async ({ message, leadId }) => {
      if (!user) return;

      const queryKey = ['messages_v6', leadId];
      await queryClient.cancelQueries({ queryKey });

      const previousMessages = queryClient.getQueryData<Message[]>(queryKey);
      const tempId = `temp-qm-${Date.now()}`;

      const optimisticMessage: Message = {
        id: tempId,
        lead_id: leadId,
        user_id: user.id,
        conteudo: message.conteudo || '',
        direcao: 'saida',
        remetente: 'bot',
        tipo_conteudo: message.tipo,
        criado_em: new Date().toISOString(),
        media_path: message.arquivo_path,
        id_mensagem: null,
        message_attachments: []
      };

      if (message.arquivo_path) {
        let fileType: 'imagem' | 'video' | 'audio' | 'arquivo' = 'arquivo';
        if (message.tipo === 'imagem') fileType = 'imagem';
        else if (message.tipo === 'video') fileType = 'video';
        else if (message.tipo === 'audio') fileType = 'audio';
        const finalType = message.tipo === 'pdf' ? 'pdf' : fileType;

        optimisticMessage.message_attachments = [{
          id: `att-${tempId}`,
          message_id: tempId,
          file_path: message.arquivo_path,
          file_type: finalType as any
        }];
      }

      queryClient.setQueryData<Message[]>(queryKey, (old) =>
        old ? [...old, optimisticMessage] : [optimisticMessage]
      );

      return { previousMessages };
    },
    onError: (err: any, variables, context: any) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages_v6', variables.leadId], context.previousMessages);
      }
      toast.error('Erro no envio.', { description: err.message });
    },
    onSuccess: () => {
      toast.success('Mensagem enviada!');
    },
  });

  const updateMessagesOrder = useMutation({
    mutationFn: async (updates: { id: string; position: number; folder_id: string | null }[]) => {
      if (!user || !orgId) return;

      const promises = updates.map(update =>
        supabase
          .from('mensagens_rapidas')
          .update({ position: update.position, folder_id: update.folder_id })
          .eq('id', update.id)
      );

      await Promise.all(promises);
    },
    onSuccess: () => { },
    onError: (err: any) => {
      toast.error(`Erro ao salvar ordem das mensagens: ${err.message}`);
      queryClient.invalidateQueries({ queryKey: ['quick_messages', orgId] });
    }
  });

  return {
    quickMessages,
    isLoading,
    createQuickMessage: createQuickMessage.mutate,
    updateQuickMessage: updateQuickMessage.mutate,
    isCreating: createQuickMessage.isPending || updateQuickMessage.isPending,
    deleteQuickMessage: deleteQuickMessage.mutate,
    sendQuickMessage: sendQuickMessage.mutate,
    isSending: sendQuickMessage.isPending,
    updateMessagesOrder
  };
}