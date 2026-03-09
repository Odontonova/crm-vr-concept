import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const templates = [
  { 
    nome: 'Confirmação de Avaliação', 
    categoria: 'Agendamento', 
    conteudo: 'Olá {{nome_lead}}, tudo bem? Confirmamos sua avaliação de harmonização facial agendada para amanhã. Por favor, responda SIM para confirmar sua presença.', 
    variaveis: ['nome_lead'] 
  },
  { 
    nome: 'Orientações Pós-Procedimento', 
    categoria: 'Pós-Venda', 
    conteudo: 'Oi {{nome_lead}}. Como está se sentindo após o procedimento? Lembre-se de evitar exposição solar e esforço físico hoje. Qualquer dúvida, estamos por aqui!', 
    variaveis: ['nome_lead'] 
  },
  { 
    nome: 'Agendamento de Retorno', 
    categoria: 'Retorno', 
    conteudo: 'Olá {{nome_lead}}. Já está na hora do seu retorno para avaliarmos os resultados do seu tratamento. Qual o melhor horário para você vir à clínica?', 
    variaveis: ['nome_lead'] 
  },
  { 
    nome: 'Boas-vindas à Clínica', 
    categoria: 'Boas-vindas', 
    conteudo: 'Seja bem-vindo(a) à {{nome_escritorio}}. É um prazer cuidar da sua autoestima. Nossa equipe entrará em contato em breve para entender seus objetivos.', 
    variaveis: ['nome_escritorio'] 
  },
  { 
    nome: 'Envio de Orçamento', 
    categoria: 'Comercial', 
    conteudo: 'Olá {{nome_lead}}. Conforme sua avaliação, segue o orçamento detalhado do seu plano de tratamento. Ficamos à disposição para explicar as formas de pagamento.', 
    variaveis: ['nome_lead'] 
  },
  { 
    nome: 'Contato Inicial - Harmonização', 
    categoria: 'Comercial', 
    conteudo: 'Oi {{nome_lead}}! Vi seu interesse em harmonização facial. Gostaria de agendar uma avaliação gratuita para analisarmos seu perfil e indicarmos o melhor procedimento?', 
    variaveis: ['nome_lead'] 
  },
  { 
    nome: 'Lembrete de Parcela', 
    categoria: 'Financeiro', 
    conteudo: 'Prezado(a) {{nome_lead}}, lembramos que a parcela do seu tratamento vence amanhã. Caso já tenha efetuado o pagamento, por favor, desconsidere.', 
    variaveis: ['nome_lead'] 
  },
  { 
    nome: 'Aniversário do Paciente', 
    categoria: 'Relacionamento', 
    conteudo: 'Parabéns, {{nome_lead}}! A equipe da {{nome_escritorio}} deseja a você um ano repleto de sorrisos e realizações. Conte sempre conosco!', 
    variaveis: ['nome_lead', 'nome_escritorio'] 
  },
  { 
    nome: 'Reativação - Botox/Preenchimento', 
    categoria: 'Retenção', 
    conteudo: 'Olá {{nome_lead}}. Faz {{dias_sem_contato}} dias que realizamos seu procedimento. Que tal agendar uma visita para manutenção e garantir que os resultados continuem perfeitos?', 
    variaveis: ['nome_lead', 'dias_sem_contato'] 
  },
  { 
    nome: 'Pesquisa de Satisfação', 
    categoria: 'Qualidade', 
    conteudo: 'Oi {{nome_lead}}. Adoraríamos saber o que achou do seu atendimento e resultado aqui na clínica. Em uma escala de 0 a 10, qual nota você daria?', 
    variaveis: ['nome_lead'] 
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Usuário não encontrado');

    const { data: profile, error: profileError } = await supabaseClient
      .from('perfis')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;
    if (!profile || !profile.organization_id) throw new Error('Organização não encontrada para este usuário.');

    const orgId = profile.organization_id;

    const templatesWithIds = templates.map(t => ({ 
      ...t, 
      usuario_id: user.id,
      organization_id: orgId 
    }));

    const { error } = await supabaseClient.from('templates_mensagem').insert(templatesWithIds);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Erro na função seed-templates:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});