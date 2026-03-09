CREATE TABLE IF NOT EXISTS public.templates_mensagem (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    organization_id uuid,
    usuario_id uuid NOT NULL,
    nome text NOT NULL,
    categoria text NOT NULL,
    conteudo text NOT NULL,
    variaveis jsonb DEFAULT '[]'::jsonb,
    esta_ativo boolean DEFAULT true,
    contagem_uso integer DEFAULT 0,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now()
);

ALTER TABLE public.templates_mensagem ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.campanhas (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    organization_id uuid,
    usuario_id uuid NOT NULL,
    nome text NOT NULL,
    descricao text,
    status campaign_status DEFAULT 'draft'::campaign_status,
    segmento text,
    segmento_config jsonb,
    targeted_lead_ids jsonb,
    template_mensagem text NOT NULL,
    media_url text,
    data_agendamento timestamp with time zone,
    intervalo_segundos integer DEFAULT 300,
    contagem_destinatarios integer DEFAULT 0,
    contagem_enviados integer DEFAULT 0,
    contagem_visualizados integer DEFAULT 0,
    contagem_respostas integer DEFAULT 0,
    contagem_conversoes integer DEFAULT 0,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now()
);

ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.atividades (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    organization_id uuid,
    usuario_id uuid NOT NULL,
    lead_id uuid,
    campanha_id uuid,
    tipo text NOT NULL,
    descricao text NOT NULL,
    metadados jsonb,
    criado_em timestamp with time zone DEFAULT now()
);

ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.notificacoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid,
    lead_id uuid,
    mensagem text NOT NULL,
    status text DEFAULT 'pendente'::text,
    criado_em timestamp with time zone DEFAULT now()
);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.organization_ai_prompts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    organization_id uuid NOT NULL,
    prompt text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.organization_ai_prompts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.integracoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    organization_id uuid,
    usuario_id uuid NOT NULL,
    tipo text NOT NULL,
    nome text NOT NULL,
    status text DEFAULT 'inactive'::text,
    credenciais jsonb,
    configuracoes jsonb,
    ultima_sincronizacao timestamp with time zone,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now()
);

ALTER TABLE public.integracoes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.memoria_agente_odontonova (
    id SERIAL PRIMARY KEY,
    session_id character varying NOT NULL,
    message jsonb NOT NULL
);

ALTER TABLE public.memoria_agente_odontonova ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.memoria_agente_curso_odontonova (
    id SERIAL PRIMARY KEY,
    session_id character varying NOT NULL,
    message jsonb NOT NULL
);

ALTER TABLE public.memoria_agente_curso_odontonova ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.memoria_agente_moncao (
    id SERIAL PRIMARY KEY,
    session_id character varying NOT NULL,
    message jsonb NOT NULL
);

ALTER TABLE public.memoria_agente_moncao ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.documents (
    id BIGSERIAL PRIMARY KEY,
    content text,
    metadata jsonb,
    embedding vector
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.lead_stage_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    lead_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    stage_position integer NOT NULL,
    entered_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.lead_stage_history ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.mensagens_rapidas (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    organization_id uuid NOT NULL,
    titulo text NOT NULL,
    conteudo text,
    tipo text NOT NULL CHECK (tipo = ANY (ARRAY['texto'::text, 'audio'::text, 'imagem'::text, 'video'::text, 'pdf'::text])),
    arquivo_path text,
    criado_em timestamp with time zone DEFAULT now(),
    folder_id uuid,
    position integer DEFAULT 0
);

ALTER TABLE public.mensagens_rapidas ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.quick_message_folders (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    color text DEFAULT '#000000'::text,
    created_at timestamp with time zone DEFAULT now(),
    position integer DEFAULT 0
);

ALTER TABLE public.quick_message_folders ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.squads (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    nome text NOT NULL,
    descricao text,
    criado_em timestamp with time zone DEFAULT now()
);

ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.clientes (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    nome text,
    tipo text,
    segmento text,
    documento text,
    email text,
    telefone text,
    whatsapp text,
    instagram text,
    data_inicio date,
    duracao_meses integer DEFAULT 3,
    mes_atual integer DEFAULT 1,
    tem_bonus boolean DEFAULT false,
    status text DEFAULT 'prospeccao'::text,
    endereco_completo text,
    cidade text,
    estado text,
    cep text,
    observacoes text,
    particularidades text,
    avatar_url text,
    squad_id uuid,
    customer_success_id uuid,
    gestor_trafego_id uuid,
    dev_id uuid,
    criado_por uuid,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    deletado_em timestamp with time zone
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.entregaveis (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    cliente_id uuid,
    pilar text,
    categoria text,
    subcategoria text,
    titulo text NOT NULL,
    descricao text,
    responsavel_id uuid,
    status text DEFAULT 'pendente'::text,
    data_inicio date,
    data_prevista date,
    data_conclusao date,
    prioridade text DEFAULT 'media'::text,
    progresso integer DEFAULT 0,
    mes_relacionado integer,
    metadados jsonb DEFAULT '{}'::jsonb,
    observacoes text,
    checklist jsonb DEFAULT '[]'::jsonb,
    criado_por uuid,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    deletado_em timestamp with time zone
);

ALTER TABLE public.entregaveis ENABLE ROW LEVEL SECURITY;


-- Foreign Keys
DO $$ BEGIN
  ALTER TABLE public.templates_mensagem ADD CONSTRAINT templates_mensagem_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.templates_mensagem ADD CONSTRAINT templates_mensagem_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.campanhas ADD CONSTRAINT atividades_campanha_id_fkey FOREIGN KEY (campanha_id) REFERENCES public.campanhas(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.campanhas ADD CONSTRAINT campanhas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.campanhas ADD CONSTRAINT campanhas_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.atividades ADD CONSTRAINT atividades_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.atividades ADD CONSTRAINT atividades_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.atividades ADD CONSTRAINT atividades_campanha_id_fkey FOREIGN KEY (campanha_id) REFERENCES public.campanhas(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.atividades ADD CONSTRAINT atividades_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.notificacoes ADD CONSTRAINT notificacoes_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.notificacoes ADD CONSTRAINT notificacoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.organization_ai_prompts ADD CONSTRAINT organization_ai_prompts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.integracoes ADD CONSTRAINT integracoes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.integracoes ADD CONSTRAINT integracoes_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.lead_stage_history ADD CONSTRAINT lead_stage_history_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.lead_stage_history ADD CONSTRAINT lead_stage_history_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.mensagens_rapidas ADD CONSTRAINT mensagens_rapidas_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.quick_message_folders(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.quick_message_folders ADD CONSTRAINT mensagens_rapidas_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.quick_message_folders(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.squads ADD CONSTRAINT clientes_squad_id_fkey FOREIGN KEY (squad_id) REFERENCES public.squads(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.clientes ADD CONSTRAINT clientes_squad_id_fkey FOREIGN KEY (squad_id) REFERENCES public.squads(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.clientes ADD CONSTRAINT entregaveis_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.clientes ADD CONSTRAINT clientes_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.clientes ADD CONSTRAINT clientes_dev_id_fkey FOREIGN KEY (dev_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.clientes ADD CONSTRAINT clientes_gestor_trafego_id_fkey FOREIGN KEY (gestor_trafego_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.clientes ADD CONSTRAINT clientes_customer_success_id_fkey FOREIGN KEY (customer_success_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.entregaveis ADD CONSTRAINT entregaveis_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.entregaveis ADD CONSTRAINT entregaveis_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.entregaveis ADD CONSTRAINT entregaveis_responsavel_id_fkey FOREIGN KEY (responsavel_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
