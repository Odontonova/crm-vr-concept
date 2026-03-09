import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Profile {
  id: string;
  nome_completo?: string;
  url_avatar?: string;
  telefone?: string;
  atualizado_em: string;
  organization_id?: string;
}

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // 1. Tenta buscar o perfil existente
      const { data, error } = await supabase
        .from('perfis')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      // Se houver erro de conexão, lança
      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // 2. Se o perfil existir, retorna
      if (data) {
        return data as Profile;
      }

      // 3. AUTO-CORREÇÃO: Se não existir perfil, cria um agora
      console.log("Perfil não encontrado. Iniciando auto-criação...");

      // A. Cria uma organização para o usuário
      const orgName = (user.user_metadata?.full_name || 'Minha') + ' Empresa';
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: orgName })
        .select()
        .single();

      if (orgError) {
        console.error("Erro ao criar organização:", orgError);
        throw orgError;
      }

      // B. Cria o perfil vinculado à organização
      const newProfile = {
        id: user.id,
        nome_completo: user.user_metadata?.full_name || 'Novo Usuário',
        organization_id: newOrg.id
      };

      const { data: createdProfile, error: profileError } = await supabase
        .from('perfis')
        .insert(newProfile)
        .select()
        .single();

      if (profileError) {
        console.error("Erro ao criar perfil:", profileError);
        throw profileError;
      }

      // C. Define permissão padrão (Admin) para quem criou a conta
      await supabase.from('usuarios_papeis').insert({
        usuario_id: user.id,
        papel: 'admin'
      });

      console.log("Perfil auto-criado com sucesso:", createdProfile);
      return createdProfile as Profile;
    },
    enabled: !!user,
    retry: 1, // Tenta novamente 1 vez se falhar
  });

  const { data: role } = useQuery({
    queryKey: ['user_role', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('usuarios_papeis')
        .select('papel')
        .eq('usuario_id', user.id)
        .maybeSingle();
      return data?.papel || 'atendente'; // Default role se não encontrar
    },
    enabled: !!user
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<Omit<Profile, 'id' | 'atualizado_em' | 'organization_id'>>) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from('perfis')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success('Perfil atualizado com sucesso!', { closeButton: true });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar perfil', { closeButton: true });
    },
  });

  return { profile, role, isLoading, updateProfile: updateProfile.mutate };
}