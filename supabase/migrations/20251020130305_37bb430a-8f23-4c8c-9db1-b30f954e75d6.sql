-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'atendente', 'dentista', 'visualizador');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate to avoid privilege escalation)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create stages table (pipeline stages)
CREATE TABLE public.stages (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  order_position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  cpf TEXT,
  age INTEGER,
  gender TEXT,
  address TEXT,
  complaint TEXT NOT NULL,
  source TEXT NOT NULL,
  creative TEXT,
  status TEXT NOT NULL DEFAULT 'Ativo',
  stage_id INTEGER NOT NULL DEFAULT 1 REFERENCES public.stages(id),
  value NUMERIC(10,2),
  last_contact TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  segment TEXT,
  message_template TEXT NOT NULL,
  schedule_date TIMESTAMPTZ,
  interval_seconds INTEGER DEFAULT 300,
  recipients_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  viewed_count INTEGER DEFAULT 0,
  responded_count INTEGER DEFAULT 0,
  converted_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create message_templates table
CREATE TABLE public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create activities table (timeline/log)
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create clinic_settings table
CREATE TABLE public.clinic_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cnpj TEXT,
  email TEXT,
  phone TEXT,
  address JSONB,
  logo_url TEXT,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  currency TEXT DEFAULT 'BRL',
  business_hours JSONB,
  away_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create integrations table
CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive',
  credentials JSONB,
  settings JSONB,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create function to check if user has a specific role (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  -- Assign default role (atendente)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'atendente');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clinic_settings_updated_at
  BEFORE UPDATE ON public.clinic_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for stages
CREATE POLICY "Authenticated users can view stages"
  ON public.stages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage stages"
  ON public.stages FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for leads
CREATE POLICY "Users can view all leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create leads"
  ON public.leads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own leads"
  ON public.leads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all leads"
  ON public.leads FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete leads"
  ON public.leads FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for campaigns
CREATE POLICY "Users can view all campaigns"
  ON public.campaigns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create campaigns"
  ON public.campaigns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns"
  ON public.campaigns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all campaigns"
  ON public.campaigns FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete campaigns"
  ON public.campaigns FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for message_templates
CREATE POLICY "Users can view all templates"
  ON public.message_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create templates"
  ON public.message_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON public.message_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all templates"
  ON public.message_templates FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete templates"
  ON public.message_templates FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for activities
CREATE POLICY "Users can view all activities"
  ON public.activities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create activities"
  ON public.activities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can delete activities"
  ON public.activities FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for clinic_settings
CREATE POLICY "Users can view clinic settings"
  ON public.clinic_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage clinic settings"
  ON public.clinic_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for integrations
CREATE POLICY "Users can view all integrations"
  ON public.integrations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage integrations"
  ON public.integrations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_leads_user_id ON public.leads(user_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_stage_id ON public.leads(stage_id);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);

CREATE INDEX idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaigns_schedule_date ON public.campaigns(schedule_date);

CREATE INDEX idx_activities_user_id ON public.activities(user_id);
CREATE INDEX idx_activities_lead_id ON public.activities(lead_id);
CREATE INDEX idx_activities_created_at ON public.activities(created_at DESC);

CREATE INDEX idx_message_templates_user_id ON public.message_templates(user_id);
CREATE INDEX idx_message_templates_category ON public.message_templates(category);
CREATE INDEX idx_message_templates_is_active ON public.message_templates(is_active);

-- Insert default stages
INSERT INTO public.stages (id, name, color, order_position) VALUES
  (1, 'Novo Lead', '#3B82F6', 1),
  (2, 'Contato Inicial', '#8B5CF6', 2),
  (3, 'Qualificação', '#EC4899', 3),
  (4, 'Proposta', '#F59E0B', 4),
  (5, 'Negociação', '#10B981', 5),
  (6, 'Convertido', '#22C55E', 6);

-- Insert default message templates
INSERT INTO public.message_templates (user_id, name, category, content, variables) 
SELECT 
  auth.uid(),
  'Primeiro Contato',
  'Follow-up',
  'Olá {{nome}}! 👋 Sou da {{clinica}} e vi que você demonstrou interesse em nossos serviços. Como posso ajudar?',
  '["nome", "clinica"]'::jsonb
WHERE auth.uid() IS NOT NULL;

INSERT INTO public.message_templates (user_id, name, category, content, variables)
SELECT
  auth.uid(),
  'Lembrete de Consulta',
  'Lembrete',
  'Olá {{nome}}! 🦷 Lembrando que sua consulta está agendada para {{data}} às {{hora}}. Te esperamos!',
  '["nome", "data", "hora"]'::jsonb
WHERE auth.uid() IS NOT NULL;

INSERT INTO public.message_templates (user_id, name, category, content, variables)
SELECT
  auth.uid(),
  'Recuperação de Lead',
  'Recuperação',
  'Oi {{nome}}! Notei que você se interessou pelos nossos serviços mas ainda não agendou uma consulta. Posso ajudar com algo?',
  '["nome"]'::jsonb
WHERE auth.uid() IS NOT NULL;