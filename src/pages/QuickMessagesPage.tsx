import { useState, useRef, useEffect, useMemo } from "react";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  DropAnimation
} from "@dnd-kit/core";
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useQuickMessages, QuickMessage } from "@/hooks/useQuickMessages";
import { useQuickMessageFolders, QuickMessageFolder } from "@/hooks/useQuickMessageFolders";
import { Plus, Trash2, MessageSquare, Mic, Image as ImageIcon, Video, FileText, Upload, Zap, FolderPlus, Folder } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { SortableFolder } from "@/components/quick-messages/SortableFolder";
import { SortableMessageCard } from "@/components/quick-messages/SortableMessageCard";
import { createPortal } from "react-dom";
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

export default function QuickMessagesPage() {
  const { 
    quickMessages, 
    isLoading: isLoadingMsgs, 
    createQuickMessage, 
    updateQuickMessage,
    deleteQuickMessage, 
    isCreating: isCreatingMsg,
    updateMessagesOrder 
  } = useQuickMessages();
  
  const { 
    folders, 
    isLoading: isLoadingFolders, 
    createFolder, 
    deleteFolder,
    updateFoldersOrder 
  } = useQuickMessageFolders();
  
  const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  
  // DnD States
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<any>(null);
  
  // Local state for optimistic updates
  const [localFolders, setLocalFolders] = useState<QuickMessageFolder[]>([]);
  const [localMessages, setLocalMessages] = useState<QuickMessage[]>([]);

  // Deletion States
  const [msgToDelete, setMsgToDelete] = useState<string | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);

  // Editing State
  const [editingMessage, setEditingMessage] = useState<QuickMessage | null>(null);

  // Sync with data
  useEffect(() => {
    setLocalFolders(folders);
  }, [folders]);

  useEffect(() => {
    setLocalMessages(quickMessages);
  }, [quickMessages]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 8, // Avoid accidental drags
        },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Forms State
  const [msgFormData, setMsgFormData] = useState({
    titulo: "",
    conteudo: "",
    tipo: "texto",
    folder_id: "none",
  });
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [folderFormData, setFolderFormData] = useState({ name: "", color: "#3b82f6" });

  const handleEditMessage = (message: QuickMessage) => {
    setEditingMessage(message);
    setMsgFormData({
      titulo: message.titulo,
      conteudo: message.conteudo || "",
      tipo: message.tipo,
      folder_id: message.folder_id || "none",
    });
    setFile(null); // Reset file input
    setIsMsgModalOpen(true);
  };

  const handleMsgSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingMessage) {
      updateQuickMessage({
        id: editingMessage.id,
        ...msgFormData,
        folder_id: msgFormData.folder_id === "none" ? null : msgFormData.folder_id,
        file
      }, {
        onSuccess: () => {
          setIsMsgModalOpen(false);
          setEditingMessage(null);
          setMsgFormData({ titulo: "", conteudo: "", tipo: "texto", folder_id: "none" });
          setFile(null);
        }
      });
    } else {
      createQuickMessage({
        ...msgFormData,
        folder_id: msgFormData.folder_id === "none" ? null : msgFormData.folder_id,
        file
      }, {
        onSuccess: () => {
          setIsMsgModalOpen(false);
          setMsgFormData({ titulo: "", conteudo: "", tipo: "texto", folder_id: "none" });
          setFile(null);
        }
      });
    }
  };

  const handleFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderFormData.name) return;
    createFolder.mutate(folderFormData, {
      onSuccess: () => {
        setIsFolderModalOpen(false);
        setFolderFormData({ name: "", color: "#3b82f6" });
      }
    });
  };

  const handleConfirmMsgDelete = () => {
    if (msgToDelete) {
      deleteQuickMessage(msgToDelete);
      setMsgToDelete(null);
    }
  };

  const handleConfirmFolderDelete = () => {
    if (folderToDelete) {
      deleteFolder.mutate(folderToDelete);
      setFolderToDelete(null);
    }
  };

  // --- Drag and Drop Handlers ---

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    if (active.data.current?.type === "Folder") {
      setActiveItem(active.data.current.folder);
    } else if (active.data.current?.type === "Message") {
      setActiveItem(active.data.current.message);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Apenas para mensagens
    if (active.data.current?.type !== "Message") return;

    // Encontrar a mensagem ativa e a sobreposta (ou pasta sobreposta)
    const activeMsg = localMessages.find(m => m.id === activeId);
    const overMsg = localMessages.find(m => m.id === overId);
    const overFolder = localFolders.find(f => f.id === overId); // Se arrastar para cima de uma pasta vazia ou header

    if (!activeMsg) return;

    // Caso 1: Arrastando sobre outra mensagem
    if (overMsg) {
      if (activeMsg.folder_id !== overMsg.folder_id) {
        setLocalMessages((items) => {
          const activeIndex = items.findIndex((i) => i.id === activeId);
          const overIndex = items.findIndex((i) => i.id === overId);
          
          if (activeIndex !== -1 && overIndex !== -1) {
             const newItems = [...items];
             // Atualiza a folder_id da mensagem arrastada para a da mensagem alvo
             newItems[activeIndex] = { ...newItems[activeIndex], folder_id: overMsg.folder_id };
             return arrayMove(newItems, activeIndex, overIndex);
          }
          return items;
        });
      }
    } 
    // Caso 2: Arrastando sobre uma pasta (header)
    else if (overFolder) {
      if (activeMsg.folder_id !== overFolder.id) {
        setLocalMessages((items) => {
          const activeIndex = items.findIndex((i) => i.id === activeId);
          if (activeIndex !== -1) {
            const newItems = [...items];
            newItems[activeIndex] = { ...newItems[activeIndex], folder_id: overFolder.id };
            return arrayMove(newItems, activeIndex, activeIndex); // Mantém posição, só muda pasta
          }
          return items;
        });
      }
    }
    // Caso 3: Arrastando para a área "Sem Pasta" (uncategorized)
    else if (overId === "uncategorized") {
        if (activeMsg.folder_id !== null) {
            setLocalMessages((items) => {
                const activeIndex = items.findIndex((i) => i.id === activeId);
                if (activeIndex !== -1) {
                    const newItems = [...items];
                    newItems[activeIndex] = { ...newItems[activeIndex], folder_id: null };
                    return arrayMove(newItems, activeIndex, activeIndex);
                }
                return items;
            });
        }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
        setActiveId(null);
        setActiveItem(null);
        return;
    }

    // --- Tratamento de Pastas ---
    if (active.data.current?.type === "Folder") {
        if (active.id !== over.id) {
            const oldIndex = localFolders.findIndex((f) => f.id === active.id);
            const newIndex = localFolders.findIndex((f) => f.id === over.id);
            
            const newOrder = arrayMove(localFolders, oldIndex, newIndex);
            setLocalFolders(newOrder); // Optimistic UI
            
            // Persist order
            const updates = newOrder.map((folder, index) => ({
                id: folder.id,
                position: index + 1
            }));
            updateFoldersOrder.mutate(updates);
        }
    }
    // --- Tratamento de Mensagens ---
    else if (active.data.current?.type === "Message") {
        const activeMsgIndex = localMessages.findIndex(m => m.id === active.id);
        const overMsgIndex = localMessages.findIndex(m => m.id === over.id);
        const overFolderId = over.data.current?.type === "Folder" ? over.id : null;
        const isUncategorized = over.id === "uncategorized";

        let newMessages = [...localMessages];

        // Se soltou sobre outra mensagem
        if (active.id !== over.id && overMsgIndex !== -1) {
            newMessages = arrayMove(newMessages, activeMsgIndex, overMsgIndex);
        }

        setLocalMessages(newMessages);

        // Atualizar todas as posições para garantir consistência
        const updates = newMessages.map((msg, index) => ({
            id: msg.id,
            position: index + 1,
            folder_id: msg.folder_id // Já atualizado no DragOver
        }));

        updateMessagesOrder.mutate(updates);
    }

    setActiveId(null);
    setActiveItem(null);
  };

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: "0.5",
        },
      },
    }),
  };

  // --- Helpers ---
  const getMessagesByFolder = (folderId: string | null) => {
    return localMessages.filter(m => (m.folder_id || null) === folderId);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            Mensagens Rápidas
          </h1>
          <p className="text-muted-foreground mt-1">Crie atalhos e organize suas mensagens em pastas.</p>
        </div>
        
        <div className="flex gap-2">
          {/* Nova Pasta */}
          <Dialog open={isFolderModalOpen} onOpenChange={setIsFolderModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <FolderPlus className="h-4 w-4" /> Nova Pasta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Pasta</DialogTitle>
                <DialogDescription>Organize suas mensagens em categorias.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleFolderSubmit} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Nome da Pasta</Label>
                  <Input 
                    placeholder="Ex: Boas Vindas" 
                    value={folderFormData.name} 
                    onChange={e => setFolderFormData({...folderFormData, name: e.target.value})} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor da Pasta</Label>
                  <div className="flex items-center gap-3">
                    <Input 
                        type="color" 
                        value={folderFormData.color} 
                        onChange={e => setFolderFormData({...folderFormData, color: e.target.value})} 
                        className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground">{folderFormData.color}</span>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsFolderModalOpen(false)}>Cancelar</Button>
                  <Button type="submit">Criar Pasta</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Nova Mensagem / Editar Mensagem */}
          <Dialog open={isMsgModalOpen} onOpenChange={(open) => {
            setIsMsgModalOpen(open);
            if (!open) {
              setEditingMessage(null);
              setMsgFormData({ titulo: "", conteudo: "", tipo: "texto", folder_id: "none" });
              setFile(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Nova Mensagem
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingMessage ? "Editar Mensagem Rápida" : "Criar Mensagem Rápida"}</DialogTitle>
                <DialogDescription>Configure o conteúdo do botão.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleMsgSubmit} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Título do Botão *</Label>
                  <Input 
                    placeholder="Ex: Pix" 
                    value={msgFormData.titulo} 
                    onChange={e => setMsgFormData({...msgFormData, titulo: e.target.value})} 
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select 
                        value={msgFormData.tipo} 
                        onValueChange={v => setMsgFormData({...msgFormData, tipo: v as any})}
                        >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="texto">Texto</SelectItem>
                            <SelectItem value="imagem">Imagem</SelectItem>
                            <SelectItem value="audio">Áudio</SelectItem>
                            <SelectItem value="video">Vídeo</SelectItem>
                            <SelectItem value="pdf">PDF</SelectItem>
                        </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Pasta</Label>
                        <Select 
                        value={msgFormData.folder_id} 
                        onValueChange={v => setMsgFormData({...msgFormData, folder_id: v})}
                        >
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Sem Pasta</SelectItem>
                            {folders.map(folder => (
                                <SelectItem key={folder.id} value={folder.id}>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: folder.color }} />
                                        {folder.name}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                </div>

                {msgFormData.tipo === 'texto' && (
                  <div className="space-y-2">
                    <Label>Conteúdo *</Label>
                    <Textarea 
                      placeholder="Digite a mensagem..." 
                      className="h-32" 
                      value={msgFormData.conteudo} 
                      onChange={e => setMsgFormData({...msgFormData, conteudo: e.target.value})} 
                      required={msgFormData.tipo === 'texto'}
                    />
                  </div>
                )}

                {msgFormData.tipo !== 'texto' && (
                  <div className="space-y-2">
                    <Label>Arquivo de Mídia {editingMessage ? "(Opcional - deixe vazio para manter o atual)" : "*"}</Label>
                    <div 
                      className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">{file ? file.name : (editingMessage?.arquivo_path ? "Mudar arquivo atual" : "Clique para selecionar arquivo")}</span>
                    </div>
                    <Input 
                      type="file" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      accept={
                        msgFormData.tipo === 'imagem' ? 'image/*' :
                        msgFormData.tipo === 'audio' ? 'audio/*' :
                        msgFormData.tipo === 'video' ? 'video/*' :
                        msgFormData.tipo === 'pdf' ? 'application/pdf' : '*'
                      }
                    />
                    <div className="space-y-2">
                      <Label>Legenda (Opcional)</Label>
                      <Input 
                          placeholder="Texto junto com a mídia..." 
                          value={msgFormData.conteudo} 
                          onChange={e => setMsgFormData({...msgFormData, conteudo: e.target.value})} 
                      />
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsMsgModalOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={isCreatingMsg}>{isCreatingMsg ? 'Salvando...' : 'Salvar'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Todas as Pastas</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {isLoadingMsgs || isLoadingFolders ? (
            <div className="text-center py-10 text-muted-foreground">Carregando...</div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-4">
                <SortableContext 
                  items={localFolders.map(f => f.id)} 
                  strategy={verticalListSortingStrategy}
                >
                  {localFolders.map((folder) => (
                    <SortableFolder 
                      key={folder.id} 
                      folder={folder} 
                      messages={getMessagesByFolder(folder.id)}
                      onDeleteFolder={(id) => setFolderToDelete(id)}
                      onEditMessage={handleEditMessage}
                      onDeleteMessage={(id) => setMsgToDelete(id)}
                    />
                  ))}
                </SortableContext>

                {getMessagesByFolder(null).length > 0 && (
                    <div className="mt-8">
                        <div className="flex items-center gap-2 mb-3 pl-1">
                            <Folder className="h-5 w-5 text-muted-foreground" />
                            <h3 className="text-lg font-semibold text-muted-foreground">Sem Pasta</h3>
                        </div>
                        <SortableContext 
                            id="uncategorized" 
                            items={getMessagesByFolder(null).map(m => m.id)} 
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 border border-dashed rounded-xl bg-muted/5">
                                {getMessagesByFolder(null).map(msg => (
                                    <SortableMessageCard 
                                        key={msg.id} 
                                        message={msg} 
                                        onEdit={handleEditMessage}
                                        onDelete={(id) => setMsgToDelete(id)} 
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </div>
                )}
              </div>

              {/* Drag Overlay */}
              {createPortal(
                <DragOverlay dropAnimation={dropAnimation}>
                  {activeId && activeItem ? (
                    activeItem.color ? ( 
                        <div className="bg-background border rounded-lg p-4 shadow-xl opacity-90 w-[300px]">
                            <h3 className="font-semibold flex items-center gap-2">
                                {activeItem.name}
                            </h3>
                        </div>
                    ) : (
                        <div className="w-[280px]">
                            <SortableMessageCard message={activeItem} onEdit={() => {}} onDelete={() => {}} />
                        </div>
                    )
                  ) : null}
                </DragOverlay>,
                document.body
              )}
            </DndContext>
          )}
        </TabsContent>
      </Tabs>

      {/* Modais de Confirmação de Exclusão */}
      <AlertDialog open={!!msgToDelete} onOpenChange={() => setMsgToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mensagem rápida?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A mensagem será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmMsgDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!folderToDelete} onOpenChange={() => setFolderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pasta?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta pasta? As mensagens dentro dela não serão excluídas, mas ficarão sem pasta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmFolderDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir Pasta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}