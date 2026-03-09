"use client";

import { useQuickMessages, QuickMessage } from "@/hooks/useQuickMessages";
import { useQuickMessageFolders, QuickMessageFolder } from "@/hooks/useQuickMessageFolders";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Zap, Mic, Image as ImageIcon, Video, FileText, MessageSquare, Send, Folder, GripVertical, Bot } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Lead } from "@/hooks/useLeads";
import { InternalAiChat } from "./InternalAiChat";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface QuickMessagesSidebarProps {
  lead: Lead | null;
  activeTab: 'mensagens' | 'agente';
  onTabChange: (tab: string) => void;
  onClose: () => void;
}

function SortableMessageItem({
  msg,
  onClick,
  getIcon
}: {
  msg: QuickMessage;
  onClick: (msg: QuickMessage) => void;
  getIcon: (tipo: string) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: msg.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as 'relative',
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-2 flex items-center group">
      <div
        {...attributes}
        {...listeners}
        className="mr-1 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground p-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <Button
        variant="outline"
        className="w-full justify-start h-auto py-2 px-3 relative group/btn hover:border-primary/50 hover:bg-primary/5 text-left whitespace-normal flex-1"
        onClick={() => onClick(msg)}
      >
        <div className="flex items-start gap-2.5 w-full">
          <div className="mt-0.5 flex-shrink-0 bg-muted rounded p-1 group-hover/btn:bg-background transition-colors">
            {getIcon(msg.tipo)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-xs leading-tight">
              {msg.titulo}
            </div>
            {msg.conteudo && (
              <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 font-normal opacity-80">
                {msg.conteudo}
              </p>
            )}
          </div>
          <div className="opacity-0 group-hover/btn:opacity-100 absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground p-1 rounded-full shadow-sm transition-opacity">
            <Send className="h-2.5 w-2.5" />
          </div>
        </div>
      </Button>
    </div>
  );
}

export function QuickMessagesSidebar({ lead, activeTab, onTabChange, onClose }: QuickMessagesSidebarProps) {
  const { quickMessages, sendQuickMessage, isLoading: isLoadingMsgs, updateMessagesOrder } = useQuickMessages();
  const { folders, isLoading: isLoadingFolders } = useQuickMessageFolders();
  const [searchTerm, setSearchTerm] = useState("");
  const [messageToConfirm, setMessageToConfirm] = useState<QuickMessage | null>(null);

  const [localMessages, setLocalMessages] = useState<QuickMessage[]>([]);
  const [localFolders, setLocalFolders] = useState<QuickMessageFolder[]>([]);

  const lastSyncedMessagesRef = useRef<string>("");
  const lastSyncedFoldersRef = useRef<string>("");

  useEffect(() => {
    if (!isLoadingMsgs && quickMessages) {
      const serverStr = JSON.stringify(quickMessages);
      if (serverStr !== lastSyncedMessagesRef.current) {
        setLocalMessages(quickMessages);
        lastSyncedMessagesRef.current = serverStr;
      }
    }
  }, [quickMessages, isLoadingMsgs]);

  useEffect(() => {
    if (!isLoadingFolders && folders) {
      const serverStr = JSON.stringify(folders);
      if (serverStr !== lastSyncedFoldersRef.current) {
        setLocalFolders(folders);
        lastSyncedFoldersRef.current = serverStr;
      }
    }
  }, [folders, isLoadingFolders]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const filteredMessages = localMessages.filter(msg =>
    msg.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (msg.conteudo && msg.conteudo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleClickMessage = (msg: QuickMessage) => setMessageToConfirm(msg);

  const handleConfirmSend = () => {
    if (!lead || !messageToConfirm) return;
    sendQuickMessage({ message: messageToConfirm, leadId: lead.id, phone: lead.telefone });
    setMessageToConfirm(null);
  };

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'audio': return <Mic className="h-3.5 w-3.5 text-blue-500" />;
      case 'imagem': return <ImageIcon className="h-3.5 w-3.5 text-purple-500" />;
      case 'video': return <Video className="h-3.5 w-3.5 text-pink-500" />;
      case 'pdf': return <FileText className="h-3.5 w-3.5 text-red-500" />;
      default: return <MessageSquare className="h-3.5 w-3.5 text-gray-500" />;
    }
  };

  const getMessagesByFolder = (folderId: string | null) => filteredMessages.filter(m => (m.folder_id || null) === folderId);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localMessages.findIndex((item) => item.id === active.id);
    const newIndex = localMessages.findIndex((item) => item.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newItems = arrayMove(localMessages, oldIndex, newIndex);
      setLocalMessages(newItems);
      const updates = newItems.map((msg, index) => ({ id: msg.id, position: index + 1, folder_id: msg.folder_id || null }));
      updateMessagesOrder.mutate(updates);
    }
  };

  if (!lead) return null;

  return (
    <div className="h-full flex flex-col bg-background w-72 xl:w-80 2xl:w-96 flex-shrink-0 shadow-sm border-l">
      <Tabs value={activeTab} onValueChange={onTabChange} className="h-full flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-12 p-0 flex-shrink-0">
          <TabsTrigger value="mensagens" className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none bg-transparent text-xs sm:text-sm">
            <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
            Atalhos
          </TabsTrigger>
          <TabsTrigger value="agente" className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none bg-transparent text-xs sm:text-sm">
            <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
            Agente IA
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="mensagens"
          className="m-0 mt-0 flex-1 border-none data-[state=active]:flex flex-col overflow-hidden"
        >
          <div className="p-3 border-b flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar atalho..."
                className="pl-8 h-8 text-xs bg-muted/30 border-muted-foreground/10 focus-visible:ring-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {isLoadingMsgs || isLoadingFolders ? (
              <div className="text-center py-8 text-xs text-muted-foreground">Carregando...</div>
            ) : (
              <div className="p-2">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <Accordion type="multiple" defaultValue={localFolders.map(f => f.id)} className="w-full space-y-2">
                    {localFolders.map(folder => {
                      const msgs = getMessagesByFolder(folder.id);
                      if (msgs.length === 0) return null;
                      return (
                        <AccordionItem key={folder.id} value={folder.id} className="border-b-0">
                          <AccordionTrigger className="hover:no-underline py-1.5 px-2 rounded hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: folder.color }} />
                              {folder.name}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-1 pb-0 px-1">
                            <SortableContext items={msgs.map(m => m.id)} strategy={verticalListSortingStrategy}>
                              {msgs.map(msg => (
                                <SortableMessageItem key={msg.id} msg={msg} onClick={handleClickMessage} getIcon={getIcon} />
                              ))}
                            </SortableContext>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}

                    {getMessagesByFolder(null).length > 0 && (
                      <AccordionItem value="uncategorized" className="border-b-0">
                        <AccordionTrigger className="hover:no-underline py-1.5 px-2 rounded hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            <Folder className="h-3.5 w-3.5" />
                            Geral
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-1 pb-0 px-1">
                          <SortableContext items={getMessagesByFolder(null).map(m => m.id)} strategy={verticalListSortingStrategy}>
                            {getMessagesByFolder(null).map(msg => (
                              <SortableMessageItem key={msg.id} msg={msg} onClick={handleClickMessage} getIcon={getIcon} />
                            ))}
                          </SortableContext>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                </DndContext>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent
          value="agente"
          className="m-0 mt-0 flex-1 border-none data-[state=active]:flex flex-col overflow-hidden justify-start items-stretch"
        >
          <InternalAiChat leadId={lead.id} onClose={onClose} />
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!messageToConfirm} onOpenChange={(open) => !open && setMessageToConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envio</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja enviar a mensagem <strong>"{messageToConfirm?.titulo}"</strong> para {lead?.nome}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSend} className="bg-primary hover:bg-primary/90">
              Confirmar Envio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}