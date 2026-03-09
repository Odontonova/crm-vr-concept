import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Mic, Image as ImageIcon, Video, FileText, MessageSquare, GripVertical, Pencil } from "lucide-react";
import { QuickMessage } from "@/hooks/useQuickMessages";
import { cn } from "@/lib/utils";

interface SortableMessageCardProps {
  message: QuickMessage;
  onEdit: (message: QuickMessage) => void;
  onDelete: (id: string) => void;
}

export function SortableMessageCard({ message, onEdit, onDelete }: SortableMessageCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: message.id,
    data: {
      type: "Message",
      message,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'audio': return <Mic className="h-3 w-3" />;
      case 'imagem': return <ImageIcon className="h-3 w-3" />;
      case 'video': return <Video className="h-3 w-3" />;
      case 'pdf': return <FileText className="h-3 w-3" />;
      default: return <MessageSquare className="h-3 w-3" />;
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="h-full">
      <Card className={cn(
        "h-full flex flex-col group relative hover:border-primary/50 transition-colors bg-card",
        isDragging && "border-primary shadow-lg ring-1 ring-primary"
      )}>
        <div 
          {...attributes} 
          {...listeners} 
          className="absolute top-2 right-2 p-1 text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing z-10"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        <CardHeader className="p-4 pb-2 space-y-0">
          <div className="flex items-start justify-between pr-6">
            <CardTitle className="text-sm font-semibold truncate w-full" title={message.titulo}>
              {message.titulo}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
            {getIcon(message.tipo)}
            <span className="capitalize">{message.tipo}</span>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 pt-2 flex-1 flex flex-col justify-between">
          <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5em] mb-2">
            {message.conteudo || (message.arquivo_path ? "Arquivo de mídia anexado" : "Sem conteúdo")}
          </p>
          
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-dashed">
            {message.arquivo_path ? (
              <Badge variant="secondary" className="text-[9px] h-5 px-1.5 max-w-[120px] truncate">
                {message.arquivo_path.split('/').pop()}
              </Badge>
            ) : <span />}
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(message);
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(message.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}