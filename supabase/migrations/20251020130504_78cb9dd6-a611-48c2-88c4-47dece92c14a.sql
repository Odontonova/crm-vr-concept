-- Fix security warnings

-- 1. Move uuid-ossp extension to extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;

-- 2. Fix function search_path for update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3. Fix function search_path for handle_new_user (already has it, but ensuring it's correct)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'atendente');
  
  RETURN NEW;
END;
$$;

-- 4. Add RLS policies for existing tables that don't have them

-- Documents table policies (read-only for authenticated users)
CREATE POLICY "Authenticated users can view documents"
  ON public.documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage documents"
  ON public.documents FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Memoria agente odontonova policies
CREATE POLICY "Authenticated users can manage memoria_agente_odontonova"
  ON public.memoria_agente_odontonova FOR ALL
  TO authenticated
  USING (true);

-- Memoria agente curso odontonova policies  
CREATE POLICY "Authenticated users can manage memoria_agente_curso_odontonova"
  ON public.memoria_agente_curso_odontonova FOR ALL
  TO authenticated
  USING (true);