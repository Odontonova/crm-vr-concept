import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Buffer } from 'https://deno.land/std@0.140.0/node/buffer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para limpar o número de telefone
const cleanPhoneNumber = (phone: string): string => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && !cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  } else if (cleaned.length === 10 && !cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  return cleaned;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    
    // Parâmetros principais
    const from = payload.from || payload.phone || payload.number; 
    const body = payload.body || payload.caption || '';
    const mediaUrl = payload.mediaUrl || payload.media?.url;
    const mediaType = payload.mediaType || payload.media?.type || payload.media?.mimetype;
    const externalId = payload.id || payload.id_mensagem || payload.messageId || payload.wamid || null;
    
    const direction = payload.direction || 'entrada'; 
    const sender = payload.sender || 'lead'; 

    if (!from) throw new Error('O número de telefone (from/phone) é obrigatório.');

    const phoneWithCountryCode = cleanPhoneNumber(from);
    const phoneWithoutCountryCode = phoneWithCountryCode.startsWith('55') 
      ? phoneWithCountryCode.substring(2) 
      : phoneWithCountryCode;

    // 1. Encontrar o Lead
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .select('id, organization_id')
      .in('telefone', [phoneWithCountryCode, phoneWithoutCountryCode])
      .limit(1)
      .single();

    if (leadError || !lead) {
      console.warn(`Lead não encontrado para os telefones: ${phoneWithCountryCode} ou ${phoneWithoutCountryCode}`);
      return new Response(JSON.stringify({ message: 'Lead não encontrado.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    let uploadedFilePath: string | null = null;
    let finalFileType: string | null = null;

    // 2. Se houver mídia, processá-la PRIMEIRO
    if (mediaUrl && mediaType) {
      // Se for uma URL do próprio Supabase, tenta reaproveitar (lógica simples)
      // Mas para garantir, baixamos se for externa.
      
      const mediaResponse = await fetch(mediaUrl);
      if (!mediaResponse.ok) throw new Error('Falha ao baixar a mídia da URL fornecida.');
      const mediaData = await mediaResponse.arrayBuffer();

      let fileExtension = 'bin';
      if (mediaType.includes('pdf')) {
        fileExtension = 'pdf';
        finalFileType = 'pdf';
      } else if (mediaType.includes('image')) {
        fileExtension = mediaType.split('/')[1] || 'jpg';
        finalFileType = 'imagem';
      } else if (mediaType.includes('video')) {
        fileExtension = 'mp4';
        finalFileType = 'video';
      } else if (mediaType.includes('audio') || mediaType.includes('ogg')) {
        fileExtension = 'mp3'; 
        if (mediaType.includes('ogg')) fileExtension = 'ogg';
        finalFileType = 'audio';
      } else {
        fileExtension = mediaType.split('/')[1] || 'bin';
        finalFileType = 'arquivo';
      }

      // Caminho limpo: ORG_ID/LEAD_ID/TIMESTAMP.EXT
      const filePath = `${lead.organization_id}/${lead.id}/${Date.now()}.${fileExtension}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('media-mensagens')
        .upload(filePath, mediaData, { contentType: mediaType });

      if (uploadError) throw uploadError;

      uploadedFilePath = filePath;
    }

    // 3. Inserir a mensagem 
    // FIX: Adicionado media_path aqui também para garantir redundância
    const { data: message, error: messageError } = await supabaseAdmin
      .from('mensagens')
      .insert({
        lead_id: lead.id,
        conteudo: body,
        direcao: direction, 
        remetente: sender, 
        tipo_conteudo: uploadedFilePath ? finalFileType : 'texto',
        id_mensagem: externalId,
        media_path: uploadedFilePath // Salva o caminho aqui também
      })
      .select('id')
      .single();

    if (messageError) throw messageError;

    // 4. Vincular o anexo (tabela específica)
    if (uploadedFilePath && finalFileType) {
      const { error: attachmentError } = await supabaseAdmin
        .from('message_attachments')
        .insert({
          message_id: message.id,
          file_path: uploadedFilePath,
          file_type: finalFileType as any,
        });

      if (attachmentError) throw attachmentError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Erro na função receive-message:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});