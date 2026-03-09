import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { addMinutes } from 'https://esm.sh/date-fns@2.30.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Tratamento de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Payload esperado do n8n
    const { lead_id, telefone, action, duration_minutes } = await req.json();

    if (!lead_id && !telefone) {
      throw new Error('É necessário fornecer lead_id ou telefone.');
    }

    // Ações permitidas: 'on', 'off', 'pause'
    if (!['on', 'off', 'pause'].includes(action)) {
      throw new Error("Ação inválida. Use: 'on', 'off' ou 'pause'.");
    }

    // Constrói a query para encontrar o lead
    let query = supabaseAdmin.from('leads').select('id').limit(1);
    
    if (lead_id) {
      query = query.eq('id', lead_id);
    } else if (telefone) {
      // Limpa telefone para garantir match (remove caracteres não numéricos)
      const cleanPhone = telefone.replace(/\D/g, '');
      // Tenta encontrar com ou sem 55 se necessário, mas aqui faremos match exato ou parcial comum
      query = query.or(`telefone.eq.${cleanPhone},telefone.eq.55${cleanPhone},telefone.eq.${cleanPhone.replace(/^55/, '')}`);
    }

    const { data: leads, error: findError } = await query;

    if (findError || !leads || leads.length === 0) {
      throw new Error('Lead não encontrado.');
    }

    const targetLeadId = leads[0].id;
    let updateData = {};

    // Lógica das ações
    if (action === 'off') {
      // Desativa o botão (Switch)
      updateData = { ia_ativa: false, ia_paused_until: null };
    } 
    else if (action === 'on') {
      // Ativa o botão e limpa qualquer pausa
      updateData = { ia_ativa: true, ia_paused_until: null };
    } 
    else if (action === 'pause') {
      // Mantém o botão ativo (true), mas define um tempo de pausa
      // Se não enviar minutos, pausa por 1 hora (padrão)
      const minutes = duration_minutes || 60;
      const pausedUntil = addMinutes(new Date(), minutes).toISOString();
      updateData = { ia_ativa: true, ia_paused_until: pausedUntil };
    }

    // Atualiza o Lead
    const { error: updateError } = await supabaseAdmin
      .from('leads')
      .update(updateData)
      .eq('id', targetLeadId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `IA atualizada para: ${action}`, 
        lead_id: targetLeadId,
        updates: updateData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});