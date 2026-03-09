import React, { useState, useEffect } from 'react';
import { Input, InputProps } from '@/components/ui/input';

interface CurrencyInputProps extends Omit<InputProps, 'onChange' | 'value'> {
  value: number | null | undefined;
  onValueChange: (value: number | undefined) => void;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
      if (value !== null && value !== undefined) {
        const formatted = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(value);
        setDisplayValue(formatted);
      } else {
        setDisplayValue('');
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const numericValue = inputValue.replace(/\D/g, '');

      if (numericValue === '') {
        setDisplayValue('');
        onValueChange(undefined);
        return;
      }

      const number = parseInt(numericValue, 10) / 100;
      const formatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(number);
      
      setDisplayValue(formatted);
      onValueChange(number);
    };

    return (
      <Input
        {...props}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        placeholder="R$ 0,00"
        type="text" // Use text type to allow currency symbols
      />
    );
  }
);
CurrencyInput.displayName = 'CurrencyInput';