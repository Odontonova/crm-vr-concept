import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface Tag {
  id: string;
  name: string;
  color: string;
  organization_id: string;
  label_lid?: string | null;
}

export const TAG_COLORS = [
  { name: 'slate', label: 'Cinza', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', selector: 'bg-slate-500', hex: '#64748b' },
  { name: 'red', label: 'Vermelho', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', selector: 'bg-red-500', hex: '#ef4444' },
  { name: 'orange', label: 'Laranja', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', selector: 'bg-orange-500', hex: '#f97316' },
  { name: 'amber', label: 'Amarelo', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', selector: 'bg-amber-500', hex: '#f59e0b' },
  { name: 'green', label: 'Verde', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', selector: 'bg-emerald-500', hex: '#10b981' },
  { name: 'blue', label: 'Azul', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', selector: 'bg-blue-500', hex: '#3b82f6' },
  { name: 'indigo', label: 'Índigo', bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', selector: 'bg-indigo-500', hex: '#6366f1' },
  { name: 'violet', label: 'Violeta', bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', selector: 'bg-violet-500', hex: '#8b5cf6' },
  { name: 'pink', label: 'Rosa', bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200', selector: 'bg-pink-500', hex: '#ec4899' },
];

// Helper para gerar estilos baseados no valor da cor (preset ou hex)
export function getTagColorStyles(colorValue: string) {
  // Verifica se é um preset
  const preset = TAG_COLORS.find(c => c.name === colorValue);
  if (preset) {
    return {
      className: cn(preset.bg, preset.text, preset.border, "border"),
      style: {} as React.CSSProperties
    };
  }

  // Verifica se é um HEX válido
  if (colorValue && (colorValue.startsWith('#') || colorValue.startsWith('rgb'))) {
    return {
      className: "border",
      style: {
        backgroundColor: `${colorValue}20`, // 12% de opacidade no fundo
        color: colorValue,
        borderColor: `${colorValue}40`, // 25% de opacidade na borda
      } as React.CSSProperties
    };
  }

  // Fallback padrão (Slate)
  const defaultPreset = TAG_COLORS[0];
  return {
    className: cn(defaultPreset.bg, defaultPreset.text, defaultPreset.border, "border"),
    style: {} as React.CSSProperties
  };
}

export function useTags() {
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel('tags_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tags' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tags', orgId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, queryClient]);

  const { data: availableTags = [], isLoading: isLoadingTags } = useQuery({
    queryKey: ['tags', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('organization_id', orgId)
        .order('name');

      if (error) throw error;
      return data as Tag[];
    },
    enabled: !!orgId
  });

  const createTag = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!orgId) throw new Error("Organização não encontrada");

      const { data, error } = await supabase
        .from('tags')
        .insert({ name, color, organization_id: orgId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', orgId] });
      toast.success("Etiqueta criada!");
    },
    onError: (err: any) => toast.error(`Erro ao criar etiqueta: ${err.message}`)
  });

  const updateTag = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      if (!orgId) throw new Error("Organização não encontrada");
      const { data, error } = await supabase
        .from('tags')
        .update({ name, color })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', orgId] });
      toast.success("Etiqueta atualizada!");
    },
    onError: (err: any) => toast.error(`Erro ao atualizar etiqueta: ${err.message}`)
  });

  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      if (!orgId) throw new Error("Organização não encontrada");
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', orgId] });
      toast.success("Etiqueta excluída!");
    },
    onError: (err: any) => toast.error(`Erro ao excluir etiqueta: ${err.message}`)
  });

  return {
    availableTags,
    isLoadingTags,
    createTag,
    updateTag,
    deleteTag
  };
}

export function useLeadTags(leadId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!leadId) return;

    const channel = supabase
      .channel(`lead_tags_realtime_${leadId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads_tags', filter: `lead_id=eq.${leadId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['lead_tags', leadId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, queryClient]);

  const { data: leadTags = [], isLoading } = useQuery({
    queryKey: ['lead_tags', leadId],
    queryFn: async () => {
      if (!leadId) return [];

      const { data, error } = await supabase
        .from('leads_tags')
        .select(`
          tag_id,
          tags (
            id,
            name,
            color,
            label_lid
          )
        `)
        .eq('lead_id', leadId);

      if (error) throw error;

      return data.map((item: any) => item.tags) as Tag[];
    },
    enabled: !!leadId
  });

  const addTagToLead = useMutation({
    mutationFn: async (tagId: string) => {
      if (!leadId) throw new Error("Lead não definido");

      // 1. Vincula a etiqueta no banco de dados
      const { error } = await supabase
        .from('leads_tags')
        .insert({ lead_id: leadId, tag_id: tagId });

      if (error) throw error;

      // 2. Dispara o Webhook com dados do Lead e da Tag
      try {
        const { data: leadData } = await supabase
          .from('leads')
          .select('telefone')
          .eq('id', leadId)
          .single();

        const { data: tagData } = await supabase
          .from('tags')
          .select('label_lid')
          .eq('id', tagId)
          .single();

        if (leadData?.telefone && tagData?.label_lid) {
          await fetch('https://webhook.orbevision.shop/webhook/adiciona-etiqueta-vrconcept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telefone: leadData.telefone,
              label_lid: tagData.label_lid
            })
          });
        }
      } catch (err) {
        console.error("Falha silenciosa ao enviar webhook de etiqueta:", err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead_tags', leadId] });
    },
    onError: (err: any) => toast.error("Erro ao adicionar etiqueta.")
  });

  const removeTagFromLead = useMutation({
    mutationFn: async (tagId: string) => {
      if (!leadId) throw new Error("Lead não definido");

      // 1. Busca dados ANTES de remover
      try {
        const { data: leadData } = await supabase
          .from('leads')
          .select('telefone')
          .eq('id', leadId)
          .single();

        const { data: tagData } = await supabase
          .from('tags')
          .select('label_lid')
          .eq('id', tagId)
          .single();

        // 2. Remove do banco de dados
        const { error } = await supabase
          .from('leads_tags')
          .delete()
          .eq('lead_id', leadId)
          .eq('tag_id', tagId);

        if (error) throw error;

        // 3. Dispara o Webhook de retirada
        if (leadData?.telefone && tagData?.label_lid) {
          await fetch('https://webhook.orbevision.shop/webhook/retira-etiqueta-vrconcept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telefone: leadData.telefone,
              label_lid: tagData.label_lid
            })
          });
        }
      } catch (err) {
        console.error("Erro na operação de remoção ou webhook:", err);
        // Se for erro de banco, relança para o onError tratar
        if ((err as any).code) throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead_tags', leadId] });
    },
    onError: (err: any) => toast.error("Erro ao remover etiqueta.")
  });

  return {
    leadTags,
    isLoading,
    addTagToLead,
    removeTagFromLead
  };
}