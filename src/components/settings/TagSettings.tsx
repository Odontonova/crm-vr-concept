import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Check, Hash } from "lucide-react";
import { useTags, TAG_COLORS, Tag, getTagColorStyles } from "@/hooks/useTags";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export function TagSettings() {
  const { availableTags, isLoadingTags, createTag, updateTag, deleteTag } = useTags();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [isDeleting, setIsDeleting] = useState<Tag | null>(null);
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState(TAG_COLORS[0].hex);
  const [customHex, setCustomHex] = useState("");

  const openModal = (tag: Tag | null = null) => {
    if (tag) {
      setEditingTag(tag);
      setTagName(tag.name);
      
      // Verifica se é um preset ou hex customizado
      const isPreset = TAG_COLORS.some(c => c.name === tag.color);
      if (isPreset) {
        const preset = TAG_COLORS.find(c => c.name === tag.color);
        setTagColor(preset?.hex || TAG_COLORS[0].hex);
        setCustomHex("");
      } else {
        setTagColor(tag.color); // Assume que é hex
        setCustomHex(tag.color);
      }
    } else {
      setEditingTag(null);
      setTagName("");
      setTagColor(TAG_COLORS[0].hex);
      setCustomHex("");
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!tagName.trim()) return;
    
    // Determina a cor final a ser salva
    let finalColor = tagColor;
    
    // Se tiver um hex customizado válido, usa ele
    if (customHex && /^#[0-9A-F]{6}$/i.test(customHex)) {
      finalColor = customHex;
    } else {
      // Se for um preset selecionado, tenta salvar o nome do preset para manter consistência,
      // ou salva o hex se não encontrar o nome (fallback)
      const preset = TAG_COLORS.find(c => c.hex.toLowerCase() === tagColor.toLowerCase());
      if (preset) {
        finalColor = preset.name; // Salva 'slate', 'red', etc.
      } else {
        finalColor = tagColor; // Salva o hex direto
      }
    }

    if (editingTag) {
      updateTag.mutate({ id: editingTag.id, name: tagName, color: finalColor });
    } else {
      createTag.mutate({ name: tagName, color: finalColor });
    }
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (isDeleting) {
      deleteTag.mutate(isDeleting.id);
      setIsDeleting(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gerenciar Etiquetas</CardTitle>
          <CardDescription>Crie, edite e remova as etiquetas usadas para organizar seus leads.</CardDescription>
        </div>
        <Button className="gap-2" onClick={() => openModal()}>
          <Plus className="h-4 w-4" />
          Nova Etiqueta
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Visualização</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingTags ? (
              <TableRow><TableCell colSpan={3} className="text-center">Carregando...</TableCell></TableRow>
            ) : availableTags.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center">Nenhuma etiqueta criada.</TableCell></TableRow>
            ) : (
              availableTags.map((tag) => {
                const styles = getTagColorStyles(tag.color);
                return (
                  <TableRow key={tag.id}>
                    <TableCell className="font-medium">{tag.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("font-normal transition-all", styles.className)} style={styles.style}>
                        {tag.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openModal(tag)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setIsDeleting(tag)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Modal de Criar/Editar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTag ? "Editar Etiqueta" : "Nova Etiqueta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="tag-name">Nome da Etiqueta</Label>
              <Input id="tag-name" value={tagName} onChange={(e) => setTagName(e.target.value)} placeholder="Ex: Prioridade Alta" />
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2 mt-2 mb-4">
                {TAG_COLORS.map(color => (
                  <button
                    key={color.name}
                    onClick={() => {
                      setTagColor(color.hex);
                      setCustomHex("");
                    }}
                    className={cn(
                      "w-7 h-7 rounded-full border flex items-center justify-center transition-transform hover:scale-110",
                      color.selector,
                      (tagColor === color.hex && !customHex) ? "ring-2 ring-offset-2 ring-primary" : ""
                    )}
                    title={color.label}
                  >
                    {(tagColor === color.hex && !customHex) && <Check className="h-4 w-4 text-white" />}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Hash className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Código Hex (ex: #9568CF)" 
                    value={customHex}
                    onChange={(e) => {
                      setCustomHex(e.target.value);
                      if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                        setTagColor(e.target.value);
                      }
                    }}
                    className="pl-8"
                    maxLength={7}
                  />
                </div>
                <div 
                  className="w-10 h-10 rounded border flex-shrink-0 transition-colors"
                  style={{ backgroundColor: customHex && /^#[0-9A-F]{6}$/i.test(customHex) ? customHex : tagColor }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Exclusão */}
      <AlertDialog open={!!isDeleting} onOpenChange={() => setIsDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a etiqueta "{isDeleting?.name}"? Esta ação não pode ser desfeita.
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