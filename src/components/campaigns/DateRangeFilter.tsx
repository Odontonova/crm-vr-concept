import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { Label } from "@/components/ui/label";

interface DateRangeFilterProps {
  dateRange: DateRange | undefined;
  setDateRange: (date: DateRange | undefined) => void;
  label: string;
}

export function DateRangeFilter({ dateRange, setDateRange, label }: DateRangeFilterProps) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {/* Reutilizando DateRangePicker, mas ajustando o layout para caber no grid */}
      <div className="flex flex-col gap-2">
        <DateRangePicker 
          date={dateRange} 
          setDate={setDateRange} 
          className="w-full"
          hideQuickSelect={true} // Esconde os botões Dia/Semana/Mês/Ano para simplificar o filtro
        />
      </div>
    </div>
  );
}