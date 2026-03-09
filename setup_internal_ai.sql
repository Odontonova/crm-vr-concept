-- Tabela para armazenar as conversas entre o usuário do CRM e o Agente de IA
CREATE TABLE public.internal_ai_chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    cadencia_gerada_id UUID REFERENCES public.cadencias(id) ON DELETE SET NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.internal_ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Acesso as mensagens da IA da organizacao" ON public.internal_ai_chat_messages
FOR ALL TO authenticated 
USING (
  organization_id = (SELECT organization_id FROM public.perfis WHERE id = auth.uid() LIMIT 1)
)
WITH CHECK (
  organization_id = (SELECT organization_id FROM public.perfis WHERE id = auth.uid() LIMIT 1)
);