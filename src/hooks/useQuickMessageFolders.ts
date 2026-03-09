import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export interface QuickMessageFolder {
  id: string;
  organization_id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
}

export function useQuickMessageFolders() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  const { data: folders = [], isLoading } = useQuery({
    queryKey: ['quick_message_folders', orgId],
    queryFn: async () => {
      if (!user || !orgId) return [];
      
      const { data, error } = await supabase
        .from('quick_message_folders')
        .select('*')
        .eq('organization_id', orgId)
        .order('position', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as QuickMessageFolder[];
    },
    enabled: !!user && !!orgId,
  });

  const createFolder = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!user || !orgId) throw new Error("Usuário não autenticado");
      
      // Get max position
      const { data: maxPosData } = await supabase
        .from('quick_message_folders')
        .select('position')
        .eq('organization_id', orgId)
        .order('position', { ascending: false })
        .limit(1)
        .single();
        
      const nextPos = (maxPosData?.position || 0) + 1;

      const { data, error } = await supabase
        .from('quick_message_folders')
        .insert([{ name, color, organization_id: orgId, position: nextPos }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick_message_folders', orgId] });
      toast.success('Pasta criada com sucesso!');
    },
    onError: (err: any) => toast.error(`Erro ao criar pasta: ${err.message}`),
  });

  const deleteFolder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quick_message_folders')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick_message_folders', orgId] });
      queryClient.invalidateQueries({ queryKey: ['quick_messages', orgId] });
      toast.success('Pasta excluída.');
    },
    onError: (err: any) => toast.error(`Erro ao excluir: ${err.message}`),
  });

  const updateFoldersOrder = useMutation({
    mutationFn: async (updates: { id: string; position: number }[]) => {
      if (!user || !orgId) return;

      // Supabase doesn't support bulk update easily in client lib for different values, 
      // but we can iterate or use an RPC if performance is critical. 
      // For folders (usually few), iterating is fine.
      
      const promises = updates.map(update => 
        supabase
          .from('quick_message_folders')
          .update({ position: update.position })
          .eq('id', update.id)
      );

      await Promise.all(promises);
    },
    onSuccess: () => {
      // Silent success or optional toast
      // queryClient.invalidateQueries({ queryKey: ['quick_message_folders', orgId] });
    },
    onError: (err: any) => {
      toast.error(`Erro ao salvar ordem das pastas: ${err.message}`);
      queryClient.invalidateQueries({ queryKey: ['quick_message_folders', orgId] });
    }
  });

  return {
    folders,
    isLoading,
    createFolder,
    deleteFolder,
    updateFoldersOrder
  };
}