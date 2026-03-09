import React from 'react';
import InputMask from 'react-input-mask';
import { Input, InputProps } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface MaskedInputProps extends InputProps {
  mask: string | (string | RegExp)[];
  maskChar?: string | null;
}

const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ className, type, mask, maskChar = null, ...props }, ref) => {
    return (
      <InputMask
        mask={mask}
        maskChar={maskChar}
        {...props} // Passa todas as props para o InputMask
      >
        {/* InputMask retorna as props corretas (incluindo as mascaradas) para o Input */}
        {(inputProps: InputProps) => (
          <Input
            {...inputProps}
            ref={ref}
            className={cn(className)}
            type={type}
          />
        )}
      </InputMask>
    );
  }
);
MaskedInput.displayName = 'MaskedInput';

// Componente auxiliar para Telefone (DDD + 9 dígitos)
export const PhoneInput = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => (
  <MaskedInput
    ref={ref}
    // Máscara para (XX) XXXXX-XXXX (11 dígitos)
    mask={'(99) 99999-9999'}
    placeholder="(00) 00000-0000"
    {...props}
  />
));
PhoneInput.displayName = 'PhoneInput';

// Componente auxiliar para CPF
export const CpfInput = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => (
  <MaskedInput
    ref={ref}
    mask={'999.999.999-99'}
    placeholder="000.000.000-00"
    {...props}
  />
));
CpfInput.displayName = 'CpfInput';

export default MaskedInput;