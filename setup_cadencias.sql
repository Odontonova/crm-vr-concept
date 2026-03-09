-- 1. Criar Tabela: cadencias
CREATE TABLE public.cadencias (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text NULL,
  criado_em timestamp with time zone NULL DEFAULT now(),
  atualizado_em timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT cadencias_pkey PRIMARY KEY (id),
  CONSTRAINT cadencias_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- 2. Criar Tabela: cadencia_passos
CREATE TABLE public.cadencia_passos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cadencia_id uuid NOT NULL,
  posicao_ordem integer NOT NULL,
  tempo_espera integer NOT NULL DEFAULT 1,
  unidade_tempo text NOT NULL DEFAULT 'dias'::text,
  tipo_mensagem text NOT NULL DEFAULT 'texto'::text,
  conteudo text NULL,
  arquivo_path text NULL,
  criado_em timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT cadencia_passos_pkey PRIMARY KEY (id),
  CONSTRAINT cadencia_passos_cadencia_id_fkey FOREIGN KEY (cadencia_id) REFERENCES cadencias(id) ON DELETE CASCADE
);

-- 3. Criar Tabela: lead_cadencias (Vincula o lead à cadência)
CREATE TABLE public.lead_cadencias (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  cadencia_id uuid NOT NULL,
  passo_atual_ordem integer NULL DEFAULT 0,
  status text NULL DEFAULT 'ativo'::text,
  proxima_execucao timestamp with time zone NULL,
  criado_em timestamp with time zone NULL DEFAULT now(),
  ultima_execucao timestamp with time zone NULL,
  status_ultima_execucao text NULL,
  erro_log text NULL,
  CONSTRAINT lead_cadencias_pkey PRIMARY KEY (id),
  CONSTRAINT lead_cadencia_unique UNIQUE (lead_id, cadencia_id),
  CONSTRAINT lead_cadencias_cadencia_id_fkey FOREIGN KEY (cadencia_id) REFERENCES cadencias(id) ON DELETE CASCADE,
  CONSTRAINT lead_cadencias_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  CONSTRAINT lead_cadencias_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- 4. Criar Tabela: cadencia_logs (Monitoramento)
CREATE TABLE public.cadencia_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  cadencia_id uuid NOT NULL,
  passo_ordem integer NOT NULL,
  status text NOT NULL,
  mensagem_erro text NULL,
  enviado_em timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT cadencia_logs_pkey PRIMARY KEY (id),
  CONSTRAINT cadencia_logs_cadencia_id_fkey FOREIGN KEY (cadencia_id) REFERENCES cadencias(id) ON DELETE CASCADE,
  CONSTRAINT cadencia_logs_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  CONSTRAINT cadencia_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- HABILITAR RLS
ALTER TABLE public.cadencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadencia_passos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_cadencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadencia_logs ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE SEGURANÇA (Apenas usuários da mesma organização podem acessar)
CREATE POLICY "cadencias_org" ON public.cadencias FOR ALL USING (organization_id = get_my_org_id());
CREATE POLICY "cadencia_passos_org" ON public.cadencia_passos FOR ALL USING (
  cadencia_id IN (SELECT id FROM public.cadencias WHERE organization_id = get_my_org_id())
);
CREATE POLICY "lead_cadencias_org" ON public.lead_cadencias FOR ALL USING (organization_id = get_my_org_id());
CREATE POLICY "cadencia_logs_org" ON public.cadencia_logs FOR ALL USING (organization_id = get_my_org_id());