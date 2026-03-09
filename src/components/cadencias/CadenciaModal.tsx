import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Sparkles, ArrowDown, Upload, File as FileIcon, X } from "lucide-react";
import { Cadencia, CadenciaPasso } from "@/hooks/useCadencias";
import { cn } from "@/lib/utils";

interface CadenciaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cadencia: Cadencia | null;
  onSave: (data: { id?: string, nome: string, descricao: string, passos: CadenciaPasso[] }) => void;
  isSaving: boolean;
}

const defaultStep: CadenciaPasso = {
  posicao_ordem: 1,
  tempo_espera: 1,
  unidade_tempo: "minutos",
  tipo_mensagem: "texto",
  conteudo: "",
  arquivo_path: null,
  file: null
};

export function CadenciaModal({ open, onOpenChange, cadencia, onSave, isSaving }: CadenciaModalProps) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [passos, setPassos] = useState<CadenciaPasso[]>([{ ...defaultStep }]);

  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (open) {
      if (cadencia) {
        setNome(cadencia.nome);
        setDescricao(cadencia.descricao || "");
        setPassos(cadencia.passos?.length ? [...cadencia.passos] : [{ ...defaultStep }]);
      } else {
        setNome("");
        setDescricao("");
        setPassos([{ ...defaultStep }]);
      }
    }
  }, [open, cadencia]);

  const handleAddStep = () => {
    setPassos(prev => [...prev, { ...defaultStep, posicao_ordem: prev.length + 1 }]);
  };

  const handleRemoveStep = (index: number) => {
    setPassos(prev => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: keyof CadenciaPasso, value: any) => {
    setPassos(prev => {
      const newSteps = [...prev];
      newSteps[index] = { ...newSteps[index], [field]: value };
      
      // Limpa conteúdo se mudar para mídia e vice-versa
      if (field === 'tipo_mensagem') {
        if (value !== 'texto') newSteps[index].conteudo = "";
      }
      return newSteps;
    });
  };

  const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateStep(index, 'file', file);
    }
  };

  const removeFile = (index: number) => {
    updateStep(index, 'file', null);
    updateStep(index, 'arquivo_path', null);
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index]!.value = "";
    }
  };

  const handleInsertVar = (index: number) => {
    const currentContent = passos[index].conteudo || "";
    updateStep(index, 'conteudo', currentContent + "{{nome_lead}}");
  };

  const handleSave = () => {
    if (!nome.trim()) return;
    onSave({ id: cadencia?.id, nome, descricao, passos });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background p-0 border-none rounded-xl">
        
        <div className="p-6 border-b bg-card rounded-t-xl sticky top-0 z-20">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#C5A47E]" />
              Detalhes da Cadência
            </DialogTitle>
            <p className="text-sm text-muted-foreground pt-1">Visualize ou ajuste seu fluxo de mensagens automáticas.</p>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome da Cadência *</Label>
              <Input 
                value={nome} 
                onChange={(e) => setNome(e.target.value)} 
                className="h-11 border-primary/20 focus-visible:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição (Interna)</Label>
              <Input 
                placeholder="Objetivo deste fluxo..." 
                value={descricao} 
                onChange={(e) => setDescricao(e.target.value)} 
                className="h-11 border-border/50"
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-muted/10 relative pb-20">
          {/* Timeline Line (Background) */}
          <div className="absolute left-[54px] top-6 bottom-0 w-0.5 bg-border/50 z-0 hidden sm:block" />

          <div className="flex justify-center mb-8 relative z-10">
            <div className="bg-[#f5f1ed] text-[#8c7355] border border-[#e0d6cb] px-6 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm">
              Início do Fluxo
            </div>
          </div>

          <div className="space-y-6 relative z-10">
            {passos.map((passo, index) => (
              <div key={index} className="flex flex-col items-center">
                
                {index > 0 && <ArrowDown className="h-5 w-5 text-muted-foreground/30 mb-6" />}
                
                <div className="w-full flex items-start gap-4">
                  {/* Número do Passo */}
                  <div className="w-8 h-8 rounded-full bg-[#8c7355] text-white flex items-center justify-center font-bold shadow-md shrink-0 z-10 relative mt-4 hidden sm:flex">
                    {index + 1}
                  </div>

                  {/* Card do Passo */}
                  <div className="flex-1 bg-card border border-border/60 rounded-xl shadow-sm overflow-hidden flex flex-row">
                    <div className="w-1.5 bg-[#8c7355]" /> {/* Borda lateral colorida */}
                    
                    <div className="p-5 flex-1 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Tempo de Espera */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className="text-[10px]">🕒</span> Tempo de Espera
                          </Label>
                          <div className="flex gap-2">
                            <Input 
                              type="number" 
                              min="0"
                              value={passo.tempo_espera} 
                              onChange={(e) => updateStep(index, 'tempo_espera', parseInt(e.target.value) || 0)} 
                              className="w-20"
                            />
                            <Select value={passo.unidade_tempo} onValueChange={(v) => updateStep(index, 'unidade_tempo', v)}>
                              <SelectTrigger className="flex-1 bg-muted/30">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="minutos">Minutos</SelectItem>
                                <SelectItem value="horas">Horas</SelectItem>
                                <SelectItem value="dias">Dias</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <p className="text-[10px] text-muted-foreground italic">
                            {passo.tempo_espera} {passo.unidade_tempo} após o passo anterior {index === 0 ? "(ou ativação)" : ""}
                          </p>
                        </div>

                        {/* Tipo de Mensagem */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className="text-[10px]">💬</span> Tipo de Mensagem
                          </Label>
                          <Select value={passo.tipo_mensagem} onValueChange={(v) => updateStep(index, 'tipo_mensagem', v)}>
                            <SelectTrigger className="bg-muted/30">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="texto">Texto</SelectItem>
                              <SelectItem value="audio">Áudio</SelectItem>
                              <SelectItem value="imagem">Imagem</SelectItem>
                              <SelectItem value="video">Vídeo</SelectItem>
                              <SelectItem value="pdf">PDF</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Área de Conteúdo/Mídia */}
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-foreground/80">
                            {passo.tipo_mensagem === 'texto' ? 'Conteúdo / Legenda' : 'Legenda (Opcional)'}
                          </Label>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-[10px] text-[#C5A47E] hover:text-[#8c7355] px-2"
                            onClick={() => handleInsertVar(index)}
                          >
                            + Inserir {"{{nome_lead}}"}
                          </Button>
                        </div>

                        {/* Mídia Input */}
                        {passo.tipo_mensagem !== 'texto' && (
                          <div className="mb-3">
                            <input 
                              type="file" 
                              className="hidden" 
                              ref={el => fileInputRefs.current[index] = el} 
                              onChange={(e) => handleFileChange(index, e)}
                              accept={passo.tipo_mensagem === 'imagem' ? 'image/*' : passo.tipo_mensagem === 'video' ? 'video/*' : passo.tipo_mensagem === 'audio' ? 'audio/*' : 'application/pdf'}
                            />
                            {!passo.file && !passo.arquivo_path ? (
                              <div 
                                onClick={() => fileInputRefs.current[index]?.click()}
                                className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors bg-muted/10 text-muted-foreground"
                              >
                                <Upload className="h-5 w-5 mb-1 opacity-50" />
                                <span className="text-xs font-medium">Clique para enviar {passo.tipo_mensagem}</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <FileIcon className="h-4 w-4 text-primary shrink-0" />
                                  <span className="text-xs truncate max-w-[200px] font-medium">
                                    {passo.file?.name || passo.arquivo_path?.split('/').pop() || 'Arquivo anexado'}
                                  </span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => removeFile(index)}>
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        <Textarea 
                          value={passo.conteudo}
                          onChange={(e) => updateStep(index, 'conteudo', e.target.value)}
                          className="min-h-[80px] resize-none text-sm bg-muted/10 border-border/60"
                          placeholder={passo.tipo_mensagem === 'texto' ? "Digite a mensagem..." : "Legenda opcional..."}
                        />
                      </div>
                    </div>

                    {/* Botão de Excluir Passo Lateral */}
                    <div className="border-l border-border/40 w-12 flex items-center justify-center bg-muted/5 shrink-0">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                        onClick={() => handleRemoveStep(index)}
                        disabled={passos.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-8 relative z-10 pl-[54px] sm:pl-0">
            <Button variant="outline" className="border-dashed border-2 bg-transparent hover:bg-muted text-muted-foreground gap-2" onClick={handleAddStep}>
              <Plus className="h-4 w-4" /> Adicionar Passo
            </Button>
          </div>
        </div>

        <div className="p-4 border-t bg-card rounded-b-xl flex justify-end gap-2 sticky bottom-0 z-20">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving || !nome.trim()} className="bg-[#8c7355] hover:bg-[#7a6448] text-white shadow-md">
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}