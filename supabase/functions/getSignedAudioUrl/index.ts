import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: corsHeaders });
    }

    const { filePath } = await req.json();
    if (!filePath) {
      return new Response(JSON.stringify({ error: 'filePath is required' }), { status: 400, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const bucketsToTry = ['media-mensagens', 'audio-mensagens', 'campaign-media'];
    let signedUrlData = null;
    let lastError = null;

    // Normaliza o caminho: decodifica, remove espaços e barras iniciais
    let baseCleanPath = decodeURIComponent(filePath).trim().replace(/^\/+/, '');

    for (const bucketName of bucketsToTry) {
      // Tenta 1: Caminho exato (normalizado)
      let pathsToTry = [baseCleanPath];

      // Tenta 2: Se o caminho começar com o nome do bucket, tenta remover
      if (baseCleanPath.startsWith(`${bucketName}/`)) {
        pathsToTry.push(baseCleanPath.substring(bucketName.length + 1));
      }

      for (const path of pathsToTry) {
        // Remove barras iniciais novamente por segurança
        const finalPath = path.replace(/^\/+/, '');
        
        const { data, error } = await supabaseAdmin
          .storage
          .from(bucketName)
          .createSignedUrl(finalPath, 60 * 60 * 24); // 24h

        if (!error && data?.signedUrl) {
          // Verifica se a URL gerada é válida (opcional, mas createSignedUrl não valida existência em todas as versões)
          // Vamos assumir que se não deu erro, é válido.
          signedUrlData = data;
          break; 
        } else {
          lastError = error;
        }
      }

      if (signedUrlData) break;
    }

    if (!signedUrlData) {
      console.error(`Audio not found: ${filePath}`, lastError);
      return new Response(
        JSON.stringify({ error: 'Audio file not found in any bucket', details: lastError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    return new Response(
      JSON.stringify({ signedUrl: signedUrlData.signedUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Unexpected error in getSignedAudioUrl:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});