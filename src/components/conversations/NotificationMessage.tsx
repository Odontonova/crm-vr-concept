import { useState } from 'react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

const TRUNCATE_LENGTH = 120; // Aumentado um pouco para acomodar Markdown básico

interface NotificationMessageProps {
  message: string;
}

export function NotificationMessage({ message }: NotificationMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Prepara o texto tratando quebras de linha literais
  const cleanMessage = message.replace(/\\n/g, '\n');
  
  const isLongMessage = cleanMessage.length > TRUNCATE_LENGTH;
  const displayText = isLongMessage && !isExpanded ? `${cleanMessage.substring(0, TRUNCATE_LENGTH)}...` : cleanMessage;

  return (
    <div className="max-w-full overflow-hidden">
      <div className="prose prose-sm dark:prose-invert prose-p:leading-tight prose-p:my-0 max-w-none text-amber-900">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm, remarkBreaks]}
        >
          {displayText}
        </ReactMarkdown>
      </div>
      
      {isLongMessage && (
        <Button
          variant="link"
          className="h-auto p-0 mt-1 text-[10px] text-amber-900/70 hover:text-amber-900 font-bold underline"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Ver menos' : 'Ver mais'}
        </Button>
      )}
    </div>
  );
}