import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Shield } from "lucide-react";
import { useSourcesManager, Source } from "@/hooks/useSourcesManager";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useProfile } from "@/hooks/useProfile";

export function SourceSettings() {
  const { sources, isLoading, createSource, updateSource, deleteSource } = useSourcesManager();
  const { role } = useProfile();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [isDeleting, setIsDeleting] = useState<Source | null>(null);
  const [sourceName, setSourceName] = useState("");

  if (role !== 'admin') {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Acesso Restrito</h3>
          <p className="text-muted-foreground">Apenas administradores podem gerenciar as fontes de leads.</p>
        </CardContent>
      </Card>
    );
  }

  const openModal = (source: Source | null = null) => {
    if (source) {
      setEditingSource(source);
      setSourceName(source.nome);
    } else {
      setEditingSource(null);
      setSourceName("");
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!sourceName.trim()) return;
    if (editingSource) {
      updateSource.mutate({ id: editingSource.id, nome: sourceName });
    } else {
      createSource.mutate({ nome: sourceName });
    }
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (isDeleting) {
      deleteSource.mutate(isDeleting.id);
      setIsDeleting(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Fontes de Leads</CardTitle>
          <CardDescription>Gerencie as origens dos seus leads (ex: Facebook Ads, Indicação).</CardDescription>
        </div>
        <Button className="gap-2" onClick={() => openModal()}>
          <Plus className="h-4 w-4" />
          Nova Fonte
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={2} className="text-center">Carregando...</TableCell></TableRow>
            ) : sources.length === 0 ? (
              <TableRow><TableCell colSpan={2} className="text-center">Nenhuma fonte criada.</TableCell></TableRow>
            ) : (
              sources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell className="font-medium">{source.nome}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openModal(source)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setIsDeleting(source)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSource ? "Editar Fonte" : "Nova Fonte"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="source-name">Nome da Fonte</Label>
              <Input id="source-name" value={sourceName} onChange={(e) => setSourceName(e.target.value)} />
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
              Tem certeza que deseja excluir a fonte "{isDeleting?.nome}"? Esta ação não pode ser desfeita. Leads existentes com esta fonte não serão alterados.
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