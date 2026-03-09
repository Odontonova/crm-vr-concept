-- ==============================================================================
-- 1. EXTENSÕES
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TIPOS (ENUMS) COM VERIFICAÇÃO DE EXISTÊNCIA
-- ==============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'atendente', 'dentista', 'visualizador');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_status') THEN
        CREATE TYPE public.campaign_status AS ENUM ('draft', 'active', 'scheduled', 'completed', 'paused');
    END IF;
END $$;

-- ==============================================================================
-- 3. TABELAS (ESTRUTURA)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id),
    nome_completo TEXT,
    url_avatar TEXT,
    telefone TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.usuarios_papeis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    papel public.app_role NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.configuracoes_clinica (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id),
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    nome TEXT NOT NULL,
    cnpj TEXT,
    email TEXT,
    telefone TEXT,
    endereco JSONB,
    url_logo TEXT,
    fuso_horario TEXT DEFAULT 'America/Sao_Paulo',
    formato_data TEXT DEFAULT 'DD/MM/YYYY',
    moeda TEXT DEFAULT 'BRL',
    horario_funcionamento JSONB,
    mensagem_ausencia TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.etapas (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    cor TEXT NOT NULL,
    posicao_ordem INTEGER,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fontes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    nome TEXT NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    name TEXT NOT NULL,
    color TEXT DEFAULT 'slate',
    label_lid TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.criativos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    nome TEXT,
    titulo TEXT,
    conteudo TEXT,
    url_midia TEXT,
    url_thumbnail TEXT,
    plataforma TEXT,
    aplicativo TEXT,
    id_externo TEXT,
    platform_metrics JSONB DEFAULT '{}'::jsonb,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id),
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    criativo_id UUID REFERENCES public.criativos(id),
    nome TEXT,
    telefone TEXT NOT NULL,
    email TEXT,
    cpf TEXT,
    idade INTEGER,
    data_nascimento DATE,
    genero TEXT,
    endereco TEXT,
    queixa_principal TEXT,
    origem TEXT,
    fonte TEXT,
    status TEXT DEFAULT 'Ativo',
    resumo TEXT,
    ultimo_contato TIMESTAMP WITH TIME ZONE,
    agendamento TIMESTAMP WITH TIME ZONE,
    ia_ativa BOOLEAN DEFAULT true,
    ia_paused_until TIMESTAMP WITH TIME ZONE,
    procedimento_interesse TEXT,
    posicao_pipeline INTEGER DEFAULT 1,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.leads_tags (
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (lead_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public.mensagens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES public.leads(id),
    user_id UUID REFERENCES auth.users(id),
    conteudo TEXT,
    direcao TEXT NOT NULL,
    remetente TEXT NOT NULL,
    tipo_conteudo TEXT DEFAULT 'texto',
    media_path TEXT,
    id_mensagem TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.message_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES public.mensagens(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vendas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    lead_id UUID NOT NULL REFERENCES public.leads(id),
    usuario_id UUID REFERENCES auth.users(id),
    valor_orcado NUMERIC,
    data_orcamento DATE,
    valor_fechado NUMERIC NOT NULL,
    data_fechamento DATE DEFAULT CURRENT_DATE,
    forma_pagamento TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.marketing_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id),
    amount NUMERIC NOT NULL DEFAULT 0,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 4. FUNÇÕES E TRIGGERS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT organization_id FROM public.perfis WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios_papeis WHERE usuario_id = _user_id AND papel = _role);
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  target_org_id UUID;
BEGIN
  INSERT INTO public.organizations (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', 'Minha') || '''s Clínica')
  RETURNING id INTO target_org_id;

  INSERT INTO public.perfis (id, nome_completo, organization_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Novo Usuário'), target_org_id);

  INSERT INTO public.usuarios_papeis (usuario_id, papel)
  VALUES (NEW.id, 'admin');

  RETURN NEW;
END;
$$;

-- Aplicação dos Triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 5. SEGURANÇA (RLS) - POLÍTICAS REESCRITAS
-- ==============================================================================

ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ver perfis da organizacao" ON public.perfis;
CREATE POLICY "Ver perfis da organizacao" ON public.perfis FOR SELECT USING ((id = auth.uid()) OR (organization_id = get_my_org_id()));

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leads Org" ON public.leads;
CREATE POLICY "Leads Org" ON public.leads FOR ALL USING (organization_id = get_my_org_id());

ALTER TABLE public.criativos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Criativos Org" ON public.criativos;
CREATE POLICY "Criativos Org" ON public.criativos FOR ALL USING (organization_id = get_my_org_id());

ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Vendas Org" ON public.vendas;
CREATE POLICY "Vendas Org" ON public.vendas FOR ALL USING (organization_id = get_my_org_id());

ALTER TABLE public.etapas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura etapas" ON public.etapas;
CREATE POLICY "Leitura etapas" ON public.etapas FOR SELECT USING (true);