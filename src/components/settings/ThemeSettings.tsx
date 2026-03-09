import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aparência</CardTitle>
        <CardDescription>Personalize a aparência da aplicação. O tema será aplicado globalmente.</CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup 
          value={theme} 
          onValueChange={(value: 'light' | 'dark') => setTheme(value)}
          className="grid grid-cols-2 gap-4 max-w-md"
        >
          <div className="relative">
            <RadioGroupItem value="light" id="light" className="peer sr-only" />
            <Label
              htmlFor="light"
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
            >
              <Sun className="mb-3 h-6 w-6" />
              Claro
            </Label>
          </div>
          <div className="relative">
            <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
            <Label
              htmlFor="dark"
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
            >
              <Moon className="mb-3 h-6 w-6" />
              Escuro
            </Label>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}