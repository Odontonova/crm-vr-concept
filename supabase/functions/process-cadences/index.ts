import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'; 
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'; 
import { addMinutes, addHours, addDays } from 'https://esm.sh/date-fns@2.30.0';

const corsHeaders = { 
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 
};

// URL DO WEBHOOK CRM MONÇÃO
const WEBHOOK_URL = 'https://webhook.orbevision.shop/webhook/mensagens-crm-moncao';

serve(async (req) => { 
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseAdmin = createClient( 
    Deno.env.get('SUPABASE_URL') ?? '', 
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' 
  );

  try { 
    const nowIso = new Date().toISOString();

    const { data: leadsInCadence, error: fetchError } = await supabaseAdmin
      .from('lead_cadencias')
      .select(`id, lead_id, cadencia_id, passo_atual_ordem, organization_id`)
      .eq('status', 'ativo')
      .lte('proxima_execucao', nowIso);

    if (fetchError) throw fetchError;
    
    if (!leadsInCadence || leadsInCadence.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    for (const item of leadsInCadence) {
      try {
        const { data: lead } = await supabaseAdmin.from('leads').select('id, nome, telefone, usuario_id').eq('id', item.lead_id).single();
        const { data: cadence } = await supabaseAdmin.from('cadencias').select('id, nome').eq('id', item.cadencia_id).single();
        const { data: steps } = await supabaseAdmin.from('cadencia_passos').select('*').eq('cadencia_id', item.cadencia_id).order('posicao_ordem', { ascending: true });

        if (!lead || !cadence || !steps) throw new Error("Dados incompletos.");

        const nextStepOrder = (item.passo_atual_ordem || 0) + 1;
        const currentStep = steps.find(s => s.posicao_ordem === nextStepOrder);

        if (!currentStep) {
          await supabaseAdmin.from('lead_cadencias').update({ status: 'concluido', proxima_execucao: null }).eq('id', item.id);
          continue;
        }

        const messageBody = (currentStep.conteudo || '').replace(/\{\{nome_lead\}\}/g, lead.nome || 'Cliente');

        // 1. Registrar no histórico de mensagens (Supabase)
        const { data: insertedMsg, error: insertError } = await supabaseAdmin
          .from('mensagens')
          .insert({
            lead_id: lead.id,
            user_id: lead.usuario_id,
            conteudo: messageBody,
            direcao: 'saida',
            remetente: 'bot',
            tipo_conteudo: currentStep.tipo_mensagem,
            media_path: currentStep.arquivo_path
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // 2. Registrar anexo se existir
        if (currentStep.arquivo_path) {
          await supabaseAdmin.from('message_attachments').insert({
            message_id: insertedMsg.id,
            file_path: currentStep.arquivo_path,
            file_type: currentStep.tipo_mensagem === 'pdf' ? 'pdf' : currentStep.tipo_mensagem as any
          });
        }

        // 3. Gerar URL assinada
        let url_midia = null;
        if (currentStep.arquivo_path) {
          const { data, error: signError } = await supabaseAdmin.storage
            .from('media-mensagens')
            .createSignedUrl(currentStep.arquivo_path, 86400);
          if (!signError) url_midia = data.signedUrl;
        }

        // 4. PAYLOAD PADRONIZADO CONFORME SOLICITADO
        const payload = {
          lead_id: lead.id,
          mensagem: messageBody,
          url_midia: url_midia,
          tipo: currentStep.tipo_mensagem,
          titulo_pdf: currentStep.tipo_mensagem === 'pdf' ? (cadence.nome || 'Documento') : null,
          // Metadados extras úteis:
          telefone: lead.telefone,
          user_id: lead.usuario_id,
          remetente: 'bot',
          internal_msg_id: insertedMsg.id
        };

        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Erro Webhook status ${response.status}`);

        const followingStep = steps.find(s => s.posicao_ordem === (nextStepOrder + 1));
        const now = new Date();
        let nextDate = null;
        let finalStatus = 'ativo';

        if (followingStep) {
          nextDate = new Date();
          const tempo = followingStep.tempo_espera || 1;
          if (followingStep.unidade_tempo === 'minutos') nextDate = addMinutes(now, tempo);
          else if (followingStep.unidade_tempo === 'horas') nextDate = addHours(now, tempo);
          else nextDate = addDays(now, tempo);
          nextDate = nextDate.toISOString();
        } else {
          finalStatus = 'concluido';
        }

        await supabaseAdmin
          .from('lead_cadencias')
          .update({
            passo_atual_ordem: nextStepOrder,
            proxima_execucao: nextDate,
            status: finalStatus,
            ultima_execucao: now.toISOString(),
            status_ultima_execucao: 'sucesso',
            erro_log: null
          })
          .eq('id', item.id);

        await supabaseAdmin.from('cadencia_logs').insert({
          organization_id: item.organization_id,
          lead_id: lead.id,
          cadencia_id: item.cadencia_id,
          passo_ordem: nextStepOrder,
          status: 'sucesso'
        });

      } catch (err) {
        await supabaseAdmin.from('lead_cadencias').update({
            ultima_execucao: new Date().toISOString(),
            status_ultima_execucao: 'erro',
            erro_log: err.message
          }).eq('id', item.id);
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) { 
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); 
  } 
});