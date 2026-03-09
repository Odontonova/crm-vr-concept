import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const N8N_WEBHOOK_URL = 'https://webhook.orbevision.shop/webhook/excluir-mensagem-moncao';

serve(async (req) => {
  // Tratamento de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messageId, leadId, id_mensagem } = await req.json()

    if (!messageId) {
      throw new Error('ID da mensagem (interno) é obrigatório')
    }

    // 1. Tenta disparar o Webhook ANTES de apagar do banco.
    // Se der erro aqui, nós queremos saber.
    console.log(`[delete-message] Disparando webhook para: ${N8N_WEBHOOK_URL}`);
    
    const payload = { 
      id_mensagem: id_mensagem || null, // ID do WhatsApp (WAMID)
      lead_id: leadId,
      internal_message_id: messageId,
      timestamp: new Date().toISOString()
    };

    const webhookResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    let webhookResult = "Webhook enviado";
    
    // Se o N8N retornar erro (4xx ou 5xx), lançamos erro para alertar o front-end
    // ou logamos o erro crítico mas prosseguimos com a deleção (depende da regra de negócio).
    // Aqui, vamos logar fortemente, mas permitir a deleção para não travar o banco.
    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error(`[ERRO N8N] Status: ${webhookResponse.status}. Body: ${errorText}`);
      webhookResult = `Erro N8N: ${webhookResponse.status} - ${errorText}`;
      // OPCIONAL: Descomente a linha abaixo se quiser IMPEDIR a exclusão no banco caso o n8n falhe
      // throw new Error(`Falha no Webhook: ${webhookResult}`); 
    }

    // 2. Excluir do Banco de Dados (Supabase)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error: dbError } = await supabaseAdmin
      .from('mensagens')
      .delete()
      .eq('id', messageId)

    if (dbError) {
      throw new Error(`Erro ao excluir do banco: ${dbError.message}`)
    }

    return new Response(
      JSON.stringify({ success: true, webhook_log: webhookResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('[delete-message] Erro fatal:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})