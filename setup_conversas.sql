-- Garante que a busca pela última mensagem seja instantânea
CREATE INDEX IF NOT EXISTS idx_mensagens_lead_criado_at ON public.mensagens(lead_id, criado_em DESC);