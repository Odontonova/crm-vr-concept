-- 1. Forçar os buckets a serem PUBLICOS
UPDATE storage.buckets
SET "public" = true
WHERE id IN ('media-mensagens', 'audio-mensagens', 'campaign-media');

-- 2. Garantir que os buckets existem (cria se não existirem)
INSERT INTO storage.buckets (id, name, "public")
VALUES 
  ('media-mensagens', 'media-mensagens', true),
  ('audio-mensagens', 'audio-mensagens', true),
  ('campaign-media', 'campaign-media', true)
ON CONFLICT (id) DO UPDATE SET "public" = true;

-- 3. Remover TODAS as políticas antigas para evitar conflitos de nome
DROP POLICY IF EXISTS "Allow Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow Authenticated Full Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Access media-mensagens" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload media-mensagens" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Access" ON storage.objects;

-- 4. Criar política de LEITURA PÚBLICA (Qualquer pessoa com o link pode ver/ouvir)
CREATE POLICY "Allow Public Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id IN ('media-mensagens', 'audio-mensagens', 'campaign-media') );

-- 5. Criar política de ACESSO TOTAL para usuários autenticados (Sistema pode salvar/apagar)
CREATE POLICY "Allow Authenticated Full Access"
ON storage.objects FOR ALL
TO authenticated
USING ( bucket_id IN ('media-mensagens', 'audio-mensagens', 'campaign-media') )
WITH CHECK ( bucket_id IN ('media-mensagens', 'audio-mensagens', 'campaign-media') );