import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Loader2, GitBranch, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useInternalAiChat, InternalAiMessage } from "@/hooks/useInternalAiChat";
import { useLeadActiveCadences } from "@/hooks/useCadencias";
import { useLead } from "@/hooks/useLeads";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

export function InternalAiChat({ leadId, onClose }: { leadId: string, onClose?: () => void }) {
  const { messages, isLoading, sendMessage, isSending } = useInternalAiChat(leadId);
  const { enrollLead, isEnrolling } = useLeadActiveCadences(leadId);
  const { data: lead } = useLead(leadId);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;
    sendMessage(input);
    setInput("");
  };

  const handleApproveCadence = (cadenciaId: string) => {
    enrollLead(cadenciaId);
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfbf9] relative w-full overflow-hidden">
      {/* Área de Mensagens - Começa do topo */}
      <ScrollArea className="flex-1 w-full">
        <div ref={scrollRef} className="p-4 space-y-4 pb-6 flex flex-col justify-start min-h-full">
          
          {/* Instrução inicial - Apenas se não houver mensagens */}
          {messages.length === 0 && !isLoading && (
            <div className="bg-card border shadow-sm rounded-xl p-5 w-full text-center space-y-4 mb-4">
              <div className="w-10 h-10 bg-[#8c7355]/10 rounded-full flex items-center justify-center mx-auto text-[#8c7355]">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">Agente Estrategista</h4>
                <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                  Sou sua IA de recuperação. Posso analisar o histórico deste cliente e criar uma cadência de follow-up personalizada.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full text-[10px] font-bold text-[#8c7355] border-[#8c7355]/30 hover:bg-[#8c7355]/10 h-9"
                onClick={() => sendMessage("Crie uma cadência de follow-up em 5 passos com base no resumo deste cliente.")}
              >
                <Sparkles className="h-3 w-3 mr-2" />
                Gerar Fluxo de Recuperação
              </Button>
            </div>
          )}

          {/* Lista de Mensagens */}
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-2 text-sm", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
              <Avatar className="h-6 w-6 flex-shrink-0 mt-1">
                {msg.role === 'user' 
                  ? <AvatarFallback className="bg-muted text-[10px]"><User className="h-3 w-3"/></AvatarFallback>
                  : <AvatarFallback className="bg-[#8c7355]/20 text-[#8c7355] text-[10px]"><Bot className="h-3 w-3"/></AvatarFallback>
                }
              </Avatar>
              <div className={cn("flex flex-col max-w-[85%]", msg.role === 'user' ? "items-end" : "items-start")}>
                <div className={cn(
                  "p-3 rounded-2xl shadow-sm border", 
                  msg.role === 'user' ? "bg-muted text-foreground rounded-tr-none border-transparent" : "bg-card border-border/40 rounded-tl-none"
                )}>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-[11px] sm:text-xs leading-relaxed prose-p:my-1">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* Card Especial de Cadência Gerada */}
                {msg.cadencia_gerada_id && (
                  <div className="mt-2 w-full border border-[#8c7355]/30 bg-[#8c7355]/5 rounded-xl p-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-[#8c7355] font-bold text-[10px] uppercase tracking-wider">
                      <GitBranch className="h-3.5 w-3.5" /> Cadência Gerada
                    </div>
                    <p className="text-xs font-semibold mb-3 truncate text-foreground/80">{msg.cadencias?.nome || "Novo fluxo"}</p>
                    <Button 
                      size="sm" 
                      className="w-full h-8 text-[10px] font-bold gap-1.5 bg-[#8c7355] hover:bg-[#7a6448] text-white shadow-sm"
                      onClick={() => handleApproveCadence(msg.cadencia_gerada_id!)}
                      disabled={isEnrolling}
                    >
                      {isEnrolling ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                      Aprovar e Iniciar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex gap-2 text-sm flex-row">
              <Avatar className="h-6 w-6 flex-shrink-0 mt-1"><AvatarFallback className="bg-[#8c7355]/20 text-[#8c7355]"><Bot className="h-3 w-3"/></AvatarFallback></Avatar>
              <div className="bg-card border p-2.5 rounded-xl rounded-tl-none flex items-center gap-2 shadow-sm border-border/40">
                <Loader2 className="h-3 w-3 animate-spin text-[#8c7355]" />
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Analisando histórico...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Footer fixo na base */}
      <div className="p-3 border-t bg-card flex-shrink-0">
        <form onSubmit={handleSend} className="flex items-center gap-2 relative">
          <Input 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            placeholder="Pergunte ao estrategista..." 
            className="text-xs h-10 pr-10 border-muted-foreground/20 focus-visible:ring-[#8c7355]/30 rounded-xl bg-background"
            disabled={isSending}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="absolute right-1 top-1 h-8 w-8 bg-[#8c7355] hover:bg-[#7a6448] text-white rounded-lg transition-all" 
            disabled={!input.trim() || isSending}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}