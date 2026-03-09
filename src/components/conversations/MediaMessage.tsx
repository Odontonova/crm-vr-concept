import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MediaMessageProps {
  path: string | null;
  type: 'imagem' | 'video';
}

export function MediaMessage({ path, type }: MediaMessageProps) {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMedia = async () => {
    if (!path) {
      setIsLoading(false);
      setError("Caminho não fornecido.");
      return;
    }

    if (path.startsWith('http') || path.startsWith('blob:')) {
      setMediaUrl(path);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const BUCKETS = ['media-mensagens', 'campaign-media', 'audio-mensagens'];

    try {
      const BUCKETS = ['media-mensagens', 'campaign-media', 'audio-mensagens'];
      let bucketName = 'media-mensagens';
      let relativePath = path;

      // Descobrir o bucket correto a partir do path
      for (const bucket of BUCKETS) {
        if (path.startsWith(`${bucket}/`)) {
          bucketName = bucket;
          relativePath = path.substring(bucket.length + 1).replace(/^\/+/, '').trim();
          break;
        }
      }

      // TENTATIVA 1: URL pública direta (buckets públicos, sem JWT)
      const { data } = supabase.storage.from(bucketName).getPublicUrl(relativePath);
      if (data?.publicUrl) {
        setMediaUrl(data.publicUrl);
        return;
      }

      const { data: signedData, error: signedError } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(relativePath, 60 * 60);

      if (!signedError && signedData?.signedUrl) {
        setMediaUrl(signedData.signedUrl);
        return;
      }

      // TENTATIVA 3: Edge function como último recurso
      const { data: efData, error: efError } = await supabase.functions.invoke('get-media-url', {
        body: { mediaPath: path },
      });

      if (!efError && efData?.signedUrl) {
        setMediaUrl(efData.signedUrl);
        return;
      }

      console.warn("Mídia inacessível em todos os métodos.", efError);
      throw new Error("Mídia inacessível.");

    } catch (err: any) {
      console.error("Erro ao carregar mídia:", err);
      setError("Erro ao carregar mídia");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, [path]);

  if (isLoading) {
    return <Skeleton className="w-64 h-48 rounded-lg mt-1 bg-muted" />;
  }

  if (error || !mediaUrl) {
    return (
      <div className="flex flex-col items-start justify-center p-3 mt-1 border border-destructive/30 bg-destructive/5 rounded text-xs text-destructive gap-2 w-full max-w-xs">
        <div className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-4 w-4" />
          <span>{error || "Erro"}</span>
        </div>
        <Button variant="outline" size="sm" onClick={loadMedia} className="h-7 text-xs bg-background">
          <RefreshCw className="h-3 w-3 mr-1" /> Tentar novamente
        </Button>
      </div>
    );
  }

  if (type === 'imagem') {
    return (
      <div className="relative group mt-1">
        <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="block relative">
          <img
            src={mediaUrl}
            alt="Mídia da conversa"
            className="rounded-lg object-cover border border-border shadow-sm max-w-full max-h-[300px] bg-muted/20"
            onError={() => setError("Falha ao renderizar imagem")}
          />
        </a>
      </div>
    );
  }

  if (type === 'video') {
    return (
      <div className="mt-1">
        <video
          src={mediaUrl}
          controls
          className="max-w-full rounded-lg border border-border shadow-sm max-h-[300px] bg-black"
          onError={() => setError("Falha ao renderizar vídeo")}
        />
      </div>
    );
  }

  return null;
}