import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Shield, GripVertical, Sparkles, Filter, FilterX } from "lucide-react";
import { useStagesManager } from "@/hooks/useStagesManager";
import { Stage } from "@/hooks/useStages";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useProfile } from "@/hooks/useProfile";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const SortableStageRow = ({ stage, onEdit, onDelete, onToggleFunnel }: { stage: Stage; onEdit: (stage: Stage) => void; onDelete: (stage: Stage) => void; onToggleFunnel: (stage: Stage) => void; }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
    position: 'relative' as 'relative',
  };

  return (
    <TableRow ref={setNodeRef} style={style} {...attributes}>
      <TableCell className="font-medium flex items-center gap-2">
        <span {...listeners} className="cursor-grab p-1 text-muted-foreground hover:text-foreground">
          <GripVertical className="h-5 w-5" />
        </span>
        <div className="flex flex-col">
          <span>{stage.nome}</span>
          {stage.em_funil && (
            <span className="text-[10px] text-primary font-bold flex items-center gap-0.5">
              <Filter className="h-2.5 w-2.5" /> MÉTRICAS ATIVAS
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge style={{ backgroundColor: stage.cor, color: 'white' }}>
          {stage.nome}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${stage.em_funil ? 'text-primary' : 'text-muted-foreground'}`}
                onClick={() => onToggleFunnel(stage)}
              >
                {stage.em_funil ? <Filter className="h-4 w-4" /> : <FilterX className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {stage.em_funil ? "Remover das métricas do Funil" : "Incluir nas métricas do Funil"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(stage)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(stage)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
};

export function PipelineSettings() {
  const { stages, isLoading, createStage, updateStage, deleteStage, updateStagesOrder, updateStageFunnel } = useStagesManager();
  const { role } = useProfile();
  const [localStages, setLocalStages] = useState<Stage[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [isDeleting, setIsDeleting] = useState<Stage | null>(null);
  const [stageName, setStageName] = useState("");
  const [stageColor, setStageColor] = useState("#cccccc");
  const [isResetting, setIsResetting] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    setLocalStages(stages);
  }, [stages]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  if (role !== 'admin') {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Acesso Restrito</h3>
          <p className="text-muted-foreground">Apenas administradores podem gerenciar as etapas do pipeline.</p>
        </CardContent>
      </Card>
    );
  }

  const openModal = (stage: Stage | null = null) => {
    if (stage) {
      setEditingStage(stage);
      setStageName(stage.nome);
      setStageColor(stage.cor);
    } else {
      setEditingStage(null);
      setStageName("");
      setStageColor("#cccccc");
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!stageName.trim()) return;
    if (editingStage) {
      updateStage.mutate({ id: editingStage.id, nome: stageName, cor: stageColor });
    } else {
      const maxOrder = stages.reduce((max, s) => Math.max(max, s.posicao_ordem), 0);
      createStage.mutate({ nome: stageName, cor: stageColor, posicao_ordem: maxOrder + 1, em_funil: true } as any);
    }
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (isDeleting) {
      deleteStage.mutate(isDeleting.id);
      setIsDeleting(null);
    }
  };

  const handleToggleFunnel = (stage: Stage) => {
    updateStageFunnel.mutate({ id: stage.id, em_funil: !stage.em_funil });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setLocalStages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over!.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);

        const updates = newOrder.map((stage, index) => ({
          id: stage.id,
          posicao_ordem: index + 1,
        }));

        updateStagesOrder.mutate(updates);

        return newOrder;
      });
    }
  };

  const handleSeedStages = async () => {
    if (!confirm("Isso irá redefinir os nomes e cores das suas etapas para o padrão da VR Concept. Seus leads serão mantidos, mas as etapas podem mudar de nome. Deseja continuar?")) return;

    setIsResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-stages');
      if (error) throw error;

      toast.success("Etapas padronizadas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['stages'] });
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao padronizar etapas: " + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Etapas do Pipeline</CardTitle>
          <CardDescription>Gerencie as etapas do seu funil de vendas. Arraste para reordenar.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleSeedStages} disabled={isResetting}>
            <Sparkles className="h-4 w-4 text-primary" />
            {isResetting ? "Aplicando..." : "Padrão VR Concept"}
          </Button>
          <Button className="gap-2" onClick={() => openModal()}>
            <Plus className="h-4 w-4" />
            Nova Etapa
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Visualização</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <SortableContext items={localStages.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={3} className="text-center">Carregando...</TableCell></TableRow>
                ) : localStages.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center">Nenhuma etapa criada.</TableCell></TableRow>
                ) : (
                  localStages.map((stage) => (
                    <SortableStageRow
                      key={stage.id}
                      stage={stage}
                      onEdit={openModal}
                      onDelete={setIsDeleting}
                      onToggleFunnel={handleToggleFunnel}
                    />
                  ))
                )}
              </TableBody>
            </SortableContext>
          </Table>
        </DndContext>
      </CardContent>


      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStage ? "Editar Etapa" : "Nova Etapa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="stage-name">Nome da Etapa</Label>
              <Input id="stage-name" value={stageName} onChange={(e) => setStageName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="stage-color">Cor</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input id="stage-color" type="color" value={stageColor} onChange={(e) => setStageColor(e.target.value)} className="w-12 h-10 p-1" />
                <Input value={stageColor} onChange={(e) => setStageColor(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!isDeleting} onOpenChange={() => setIsDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a etapa "{isDeleting?.nome}"? Esta ação pode falhar se houver leads associados a ela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}