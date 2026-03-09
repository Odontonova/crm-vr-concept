import { useState, useRef, useEffect } from 'react';
import { X, Plus, Send, ChevronLeft, ChevronRight, FileText, Image as ImageIcon, Video, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface AttachmentItem {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
  type: 'image' | 'video' | 'pdf' | 'other';
}

interface AttachmentPreviewModalProps {
  files: File[];
  onClose: () => void;
  onSend: (attachments: { file: File; caption: string }[]) => void;
  isSending: boolean;
}

export function AttachmentPreviewModal({ files, onClose, onSend, isSending }: AttachmentPreviewModalProps) {
  const [items, setItems] = useState<AttachmentItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const newItems: AttachmentItem[] = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      previewUrl: URL.createObjectURL(file),
      caption: '',
      type: file.type.startsWith('image/') ? 'image' : 
            file.type.startsWith('video/') ? 'video' : 
            file.type === 'application/pdf' ? 'pdf' : 'other'
    }));
    setItems(newItems);

    return () => {
      newItems.forEach(item => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newItems: AttachmentItem[] = selectedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      previewUrl: URL.createObjectURL(file),
      caption: '',
      type: file.type.startsWith('image/') ? 'image' : 
            file.type.startsWith('video/') ? 'video' : 
            file.type === 'application/pdf' ? 'pdf' : 'other'
    }));
    setItems(prev => [...prev, ...newItems]);
  };

  const handleRemoveItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const indexToRemove = items.findIndex(item => item.id === id);
    const newItems = items.filter(item => item.id !== id);
    
    if (newItems.length === 0) {
      onClose();
      return;
    }

    setItems(newItems);
    if (selectedIndex >= newItems.length) {
      setSelectedIndex(newItems.length - 1);
    }
  };

  const updateCaption = (value: string) => {
    setItems(prev => prev.map((item, i) => 
      i === selectedIndex ? { ...item, caption: value } : item
    ));
  };

  const currentItem = items[selectedIndex];

  if (items.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={onClose} disabled={isSending}>
          <X className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          <span className="text-sm font-medium">{currentItem.file.name}</span>
          {currentItem.type === 'pdf' && <span className="text-[10px] opacity-60">Documento PDF</span>}
        </div>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 flex items-center justify-center relative px-4 overflow-hidden">
        {items.length > 1 && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute left-4 text-white/50 hover:text-white hover:bg-white/10 hidden md:flex"
            onClick={() => setSelectedIndex(prev => Math.max(0, prev - 1))}
            disabled={selectedIndex === 0 || isSending}
          >
            <ChevronLeft className="h-10 w-10" />
          </Button>
        )}

        <div className="w-full max-w-4xl h-full flex items-center justify-center">
          {currentItem.type === 'image' ? (
            <img src={currentItem.previewUrl} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" alt="Preview" />
          ) : currentItem.type === 'video' ? (
            <video src={currentItem.previewUrl} controls className="max-w-full max-h-full rounded-lg" />
          ) : currentItem.type === 'pdf' ? (
            <div className="bg-white rounded-lg p-12 flex flex-col items-center gap-4 text-zinc-800 shadow-xl">
              <FileText className="h-24 w-24 text-red-500" />
              <span className="font-medium text-center max-w-[200px] break-all">{currentItem.file.name}</span>
            </div>
          ) : (
            <div className="bg-zinc-800 rounded-lg p-12 flex flex-col items-center gap-4 text-white">
              <FileText className="h-20 w-20 opacity-40" />
              <span>Arquivo não suportado para visualização</span>
            </div>
          )}
        </div>

        {items.length > 1 && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-4 text-white/50 hover:text-white hover:bg-white/10 hidden md:flex"
            onClick={() => setSelectedIndex(prev => Math.min(items.length - 1, prev + 1))}
            disabled={selectedIndex === items.length - 1 || isSending}
          >
            <ChevronRight className="h-10 w-10" />
          </Button>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 flex flex-col items-center gap-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="w-full max-w-2xl bg-zinc-800/80 rounded-full flex items-center px-4 py-1 border border-white/10 shadow-lg focus-within:border-primary/50 transition-all">
          <Input 
            placeholder="Adicione uma legenda..." 
            className="bg-transparent border-0 text-white focus-visible:ring-0 placeholder:text-zinc-500 h-10"
            value={currentItem.caption}
            onChange={(e) => updateCaption(e.target.value)}
            disabled={isSending}
            onKeyDown={(e) => e.key === 'Enter' && onSend(items.map(it => ({ file: it.file, caption: it.caption })))}
          />
        </div>

        {/* Carousel / Add Area */}
        <div className="flex items-center gap-3 w-full justify-center overflow-x-auto pb-4 scrollbar-none">
          <div className="flex items-center gap-2 px-2">
            {items.map((item, index) => (
              <div 
                key={item.id}
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  "relative w-16 h-16 rounded-lg border-2 overflow-hidden cursor-pointer transition-all flex-shrink-0 group",
                  index === selectedIndex ? "border-primary scale-110 shadow-lg shadow-primary/20" : "border-transparent opacity-50 hover:opacity-100"
                )}
              >
                {item.type === 'image' ? (
                  <img src={item.previewUrl} className="w-full h-full object-cover" alt="Thumb" />
                ) : item.type === 'video' ? (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                    <Video className="h-6 w-6 text-white" />
                  </div>
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                )}
                
                <button 
                  onClick={(e) => handleRemoveItem(item.id, e)}
                  className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}

            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center text-white/40 hover:text-white hover:border-white/40 transition-all flex-shrink-0"
              disabled={isSending}
            >
              <Plus className="h-6 w-6" />
            </button>
            <input 
              type="file" 
              multiple 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleAddFiles} 
              accept="image/*,video/*,application/pdf"
            />
          </div>

          <Button 
            size="icon" 
            className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-white shadow-xl flex-shrink-0 ml-4 animate-in zoom-in duration-300"
            onClick={() => onSend(items.map(it => ({ file: it.file, caption: it.caption })))}
            disabled={isSending}
          >
            {isSending ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}