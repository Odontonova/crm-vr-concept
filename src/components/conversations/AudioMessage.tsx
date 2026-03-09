import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AudioPlayer } from './AudioPlayer';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AudioMessageProps {
  filePath: string;
  variant?: 'incoming' | 'outgoing';
}

export function AudioMessage({ filePath, variant = 'incoming' }: AudioMessageProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAudio = async () => {
    if (!filePath) {
      setIsLoading(false);
      setError("Caminho inválido");
      return;
    }

    console.log(`[AudioMessage] Iniciando carregamento para: ${filePath}`);
    setAudioUrl(null);
    setIsLoading(true);
    setError(null);

    // 1. Blob local (Optimistic UI)
    if (filePath.startsWith('blob:')) {
      setAudioUrl(filePath);
      setIsLoading(false);
      return;
    }

    // 2. URL completa já resolvida
    if (filePath.startsWith('http')) {
      setAudioUrl(filePath);
      setIsLoading(false);
      return;
    }

    // 3. Tenta URL pública diretamente (sem JWT)
    const BUCKETS = ['media-mensagens', 'audio-mensagens', 'campaign-media'];
    let bucketName = 'media-mensagens'; // fallback
    let relativePath = filePath;

    // Detectar qual é o bucket correto olhando o prefixo do path
    for (const bucket of BUCKETS) {
      if (filePath.startsWith(`${bucket}/`)) {
        bucketName = bucket;
        relativePath = filePath.substring(bucket.length + 1).replace(/^\/+/, '').trim();
        break;
      }
    }

    const { data } = supabase.storage.from(bucketName).getPublicUrl(relativePath);
    if (data?.publicUrl) {
      console.log(`[AudioMessage] URL pública gerada no bucket ${bucketName}:`, data.publicUrl);
      setAudioUrl(data.publicUrl);
      setIsLoading(false);
      return;
    }

    // 4. Fallback: edge function (para arquivos em buckets privados)
    try {
      const { data, error: functionError } = await supabase.functions.invoke('getSignedAudioUrl', {
        body: { filePath },
      });

      if (!functionError && data?.signedUrl) {
        console.log("[AudioMessage] URL assinada obtida via edge function");
        setAudioUrl(data.signedUrl);
        setIsLoading(false);
        return;
      }

      console.warn("[AudioMessage] Edge function falhou:", functionError || data?.error);
    } catch (err) {
      console.warn("[AudioMessage] Erro ao chamar edge function:", err);
    }

    // 5. Sem URL válida
    console.error("[AudioMessage] Não foi possível obter URL para o áudio:", filePath);
    setError("Áudio indisponível");
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAudio();
  }, [filePath]);

  if (isLoading) {
    return (
      <div className={cn("w-64 h-12 rounded-md flex items-center px-2", variant === 'outgoing' ? "bg-white/10" : "bg-muted/50")}>
        <Skeleton className={cn("h-8 w-8 rounded-full mr-2", variant === 'outgoing' ? "bg-white/20" : "bg-muted-foreground/20")} />
        <Skeleton className={cn("h-2 flex-1 rounded", variant === 'outgoing' ? "bg-white/20" : "bg-muted-foreground/20")} />
      </div>
    );
  }

  if (error || !audioUrl) {
    return (
      <div className={cn("flex items-center justify-between gap-2 p-2 w-64 rounded-md text-xs border border-dashed",
        variant === 'outgoing' ? "bg-white/10 text-white/70 border-white/20" : "bg-muted/30 text-muted-foreground")}>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{error || "Indisponível"}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-white/20"
          onClick={fetchAudio}
          title="Tentar novamente"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return <AudioPlayer audioUrl={audioUrl} variant={variant} onRetry={fetchAudio} />;
}