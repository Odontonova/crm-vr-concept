import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useLeads } from "@/hooks/useLeads"

interface LeadSelectorProps {
  selectedLeadId: string | null;
  setSelectedLeadId: (id: string | null) => void;
}

export function LeadSelector({ selectedLeadId, setSelectedLeadId }: LeadSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const { leads, isLoading } = useLeads();

  const leadOptions = React.useMemo(() => {
    if (!leads) return [];
    return [
      { value: 'todos', label: 'Todos os Clientes' },
      ...leads.map(lead => ({
        value: lead.id,
        label: lead.nome || lead.telefone,
      }))
    ];
  }, [leads]);

  const selectedLabel = leadOptions.find(option => option.value === selectedLeadId)?.label || "Selecione um cliente...";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full md:w-[250px] justify-between font-normal"
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder="Buscar cliente..." />
          <CommandList>
            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
            <CommandGroup>
              {isLoading ? (
                <CommandItem disabled>Carregando...</CommandItem>
              ) : (
                leadOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      setSelectedLeadId(option.value)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedLeadId === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}