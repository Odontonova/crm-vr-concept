import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { QuickMessageFolder } from "@/hooks/useQuickMessageFolders";
import { QuickMessage } from "@/hooks/useQuickMessages";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { SortableMessageCard } from "./SortableMessageCard";
import { Button } from "@/components/ui/button";
import { Trash2, GripVertical, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SortableFolderProps {
  folder: QuickMessageFolder;
  messages: QuickMessage[];
  onDeleteFolder: (id: string) => void;
  onEditMessage: (message: QuickMessage) => void;
  onDeleteMessage: (id: string) => void;
}

export function SortableFolder({ folder, messages, onDeleteFolder, onEditMessage, onDeleteMessage }: SortableFolderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: folder.id,
    data: {
      type: "Folder",
      folder,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-8 group">
      {/* Header da Pasta */}
      <div className="flex items-center justify-between mb-3 pl-1 pr-2">
        <div className="flex items-center gap-3">
          <div 
            {...attributes} 
            {...listeners} 
            className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
          >
            <GripVertical className="h-5 w-5" />
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: folder.color }} />
            <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
              {folder.name}
            </h3>
            <Badge variant="secondary" className="ml-1 h-5 text-xs font-normal bg-muted/50">
              {messages.length}
            </Badge>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onDeleteFolder(folder.id)}
          title="Excluir Pasta"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Grid de Mensagens */}
      <div className={cn(
        "bg-muted/10 rounded-xl p-4 border border-dashed border-transparent transition-colors min-h-[120px]",
        messages.length === 0 && "border-muted-foreground/20 flex flex-col items-center justify-center bg-muted/5"
      )}>
        <SortableContext items={messages.map(m => m.id)} strategy={rectSortingStrategy}>
          {messages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {messages.map((msg) => (
                <SortableMessageCard 
                  key={msg.id} 
                  message={msg} 
                  onEdit={onEditMessage}
                  onDelete={onDeleteMessage} 
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground/50 py-4">
              <FolderOpen className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Pasta vazia</p>
              <p className="text-xs">Arraste mensagens para cá ou crie novas.</p>
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}