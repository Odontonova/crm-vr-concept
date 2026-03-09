"use client"

import * as React from "react"
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react"

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

interface CreatableSelectProps {
  options: string[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyPlaceholder?: string
}

export function CreatableSelect({
  options,
  value,
  onChange,
  placeholder = "Selecione uma opção...",
  searchPlaceholder = "Buscar ou criar...",
  emptyPlaceholder = "Nenhuma opção encontrada.",
}: CreatableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")

  const handleSelect = (currentValue: string) => {
    onChange(currentValue)
    setOpen(false)
    setSearchTerm("")
  }

  const handleCreate = () => {
    if (searchTerm) {
      onChange(searchTerm)
      setOpen(false)
      setSearchTerm("")
    }
  }

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            <CommandEmpty>
              <div className="p-2">
                <p className="text-sm text-muted-foreground text-center mb-2">{emptyPlaceholder}</p>
                {searchTerm && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleCreate}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Criar "{searchTerm}"
                  </Button>
                )}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}