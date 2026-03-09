import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import OpenAI from 'https://esm.sh/openai@4.28.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { lead_id, message } = await req.json();
    
    if (!lead_id || !message) {
      throw new Error('lead_id e message são obrigatórios');
    }

    const authHeader = req.headers.get('Authorization');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // 1. Buscar perfil para pegar organization_id
    const { data: profile } = await supabaseClient.from('perfis').select('organization_id').eq('id', user.id).single();
    const orgId = profile?.organization_id;

    // 2. Buscar dados do Lead
    const { data: lead } = await supabaseClient.from('leads').select('*').eq('id', lead_id).single();
    if (!lead) throw new Error('Lead não encontrado');

    // 3. Buscar as últimas 10 mensagens de memória
    const { data: history } = await supabaseClient
      .from('internal_ai_chat_messages')
      .select('role, content')
      .eq('lead_id', lead_id)
      .order('criado_em', { ascending: false })
      .limit(10);

    const formattedHistory = (history || []).reverse().map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // 4. Salvar mensagem do usuário
    await supabaseClient.from('internal_ai_chat_messages').insert({
      lead_id,
      usuario_id: user.id,
      organization_id: orgId,
      role: 'user',
      content: message
    });

    // 5. Configurar xAI (Grok)
    const xaiApiKey = Deno.env.get('XAI_API_KEY');
    if (!xaiApiKey) throw new Error('XAI_API_KEY não configurada no servidor.');

    const openai = new OpenAI({
      apiKey: xaiApiKey,
      baseURL: 'https://api.x.ai/v1',
    });

    const systemPrompt = `Você é um Agente IA interno do CRM da Monção Odontologia & Estética.
Sua função primária é ler o resumo do atendimento de um cliente e criar uma cadência de follow-up (recuperação) altamente persuasiva, inteligente e humanizada.
O objetivo é fazer o cliente retomar a conversa de onde parou e agendar o procedimento.

DADOS DO CLIENTE ATUAL:
Nome: ${lead.nome || 'Não informado'}
Procedimento de Interesse: ${lead.procedimento_interesse || 'Não especificado'}
Resumo do Atendimento feito pela IA do WhatsApp:
"${lead.resumo || 'Nenhum resumo disponível. Aja com base nas instruções do atendente.'}"

REGRAS PARA CRIAÇÃO DE CADÊNCIA:
1. Sempre que o usuário pedir para gerar a cadência, proponha exatamente 5 passos de contato.
2. Defina os intervalos de tempo de forma inteligente (ex: 30 minutos após ativar, 1 dia depois, 3 dias depois...).
3. Use gatilhos mentais (escassez, autoridade, reciprocidade) adequados para estética.
4. PARA SALVAR NO SISTEMA: Sempre que você gerar uma cadência, você DEVE incluir no final da sua resposta ESTRITAMENTE o seguinte bloco JSON dentro de marcadores markdown \`\`\`json ... \`\`\`. O sistema lerá esse JSON para criar a automação.
5. As opções para "unidade_tempo" são apenas: "minutos", "horas", ou "dias".
6. As opções para "tipo_mensagem" são apenas: "texto", "audio", "imagem", "video", ou "pdf".

EXEMPLO DE FORMATO JSON ESPERADO (Gere com os dados reais):
\`\`\`json
{
  "nome_cadencia": "Recuperação: ${lead.nome || 'Cliente'}",
  "descricao": "Tentativa de retomada focada no interesse em ${lead.procedimento_interesse || 'procedimento'}",
  "passos": [
    { "posicao_ordem": 1, "tempo_espera": 30, "unidade_tempo": "minutos", "tipo_mensagem": "texto", "conteudo": "Oi {{nome_lead}}, tudo bem? Aqui é da Monção. Separei um horário para você..." },
    { "posicao_ordem": 2, "tempo_espera": 1, "unidade_tempo": "dias", "tipo_mensagem": "texto", "conteudo": "{{nome_lead}}, consegui uma condição especial com a Dra..." }
  ]
}
\`\`\`

Sempre seja prestativo, pergunte se o usuário quer ajustar algo ou se pode ativar a cadência.`;

    const messagesPayload = [
      { role: 'system', content: systemPrompt },
      ...formattedHistory,
      { role: 'user', content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: messagesPayload,
    });

    const aiMessageContent = completion.choices[0].message.content || '';

    // 6. Interceptar e Extrair JSON da Cadência
    const jsonRegex = /```json\n([\s\S]*?)\n```/;
    const match = aiMessageContent.match(jsonRegex);
    
    let generatedCadenciaId = null;
    let cleanResponse = aiMessageContent;

    if (match && match[1]) {
      try {
        const cadenceData = JSON.parse(match[1]);
        cleanResponse = aiMessageContent.replace(match[0], '').trim(); // Remove o JSON da mensagem visível

        // Salvar Cadência usando Service Role para ignorar RLS temporariamente durante a criação complexa
        const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
        
        const { data: newCadence, error: cadError } = await supabaseAdmin
          .from('cadencias')
          .insert({
            organization_id: orgId,
            nome: cadenceData.nome_cadencia,
            descricao: cadenceData.descricao
          })
          .select('id')
          .single();

        if (cadError) throw cadError;
        generatedCadenciaId = newCadence.id;

        const passosParaInserir = cadenceData.passos.map((p: any) => ({
          cadencia_id: generatedCadenciaId,
          posicao_ordem: p.posicao_ordem,
          tempo_espera: p.tempo_espera,
          unidade_tempo: p.unidade_tempo,
          tipo_mensagem: p.tipo_mensagem,
          conteudo: p.conteudo
        }));

        await supabaseAdmin.from('cadencia_passos').insert(passosParaInserir);

      } catch (parseError) {
        console.error("Erro ao parsear JSON da cadência ou inserir no banco:", parseError);
      }
    }

    // 7. Salvar resposta da IA
    const { data: insertedAiMsg } = await supabaseClient.from('internal_ai_chat_messages').insert({
      lead_id,
      usuario_id: user.id,
      organization_id: orgId,
      role: 'assistant',
      content: cleanResponse,
      cadencia_gerada_id: generatedCadenciaId
    }).select('*, cadencias(nome)').single();

    return new Response(JSON.stringify({ 
      success: true, 
      message: insertedAiMsg 
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});