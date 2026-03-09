import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Tratamento de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Inicializa o cliente Admin (Service Role) para ter poder total de leitura/escrita
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Inicializa cliente do usuário para verificar autenticação
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 1. Verificar autenticação
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // 2. Verificar papel de admin
    const { data: requesterRole } = await supabaseAdmin
      .from('usuarios_papeis')
      .select('papel')
      .eq('usuario_id', user.id)
      .single()

    if (requesterRole?.papel !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem criar usuários.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // 3. Obter e Corrigir (se necessário) a Organização do Admin
    let { data: adminProfile } = await supabaseAdmin
      .from('perfis')
      .select('organization_id, nome_completo')
      .eq('id', user.id)
      .single()

    let organizationId = adminProfile?.organization_id

    // --- AUTO-CORREÇÃO ---
    // Se o admin não tiver organização, cria uma agora e vincula.
    if (!organizationId) {
      console.log(`Admin ${user.id} sem organização. Iniciando auto-correção...`)
      
      const orgName = (adminProfile?.nome_completo || 'Minha') + ' Clínica'
      
      const { data: newOrg, error: createOrgError } = await supabaseAdmin
        .from('organizations')
        .insert({ name: orgName })
        .select('id')
        .single()

      if (createOrgError) {
        throw new Error(`Falha ao criar organização para o admin: ${createOrgError.message}`)
      }

      // Atualiza o perfil do admin
      const { error: updateProfileError } = await supabaseAdmin
        .from('perfis')
        .update({ organization_id: newOrg.id })
        .eq('id', user.id)

      if (updateProfileError) {
        throw new Error(`Falha ao vincular admin à nova organização: ${updateProfileError.message}`)
      }

      organizationId = newOrg.id
      console.log(`Auto-correção concluída. Nova Org ID: ${organizationId}`)
    }

    // 4. Obter dados do formulário
    const { email, password, fullName, role } = await req.json()
    
    if (!email || !password || !fullName || !role) {
      return new Response(
        JSON.stringify({ error: 'Preencha todos os campos obrigatórios.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // 5. Criar o novo usuário
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        full_name: fullName,
        organization_id: organizationId, 
        role: role
      }
    })

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    return new Response(
      JSON.stringify(newUser),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error("Erro crítico na função create-user:", error)
    return new Response(
      JSON.stringify({ error: `Erro interno: ${error.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})