import React, { useState, useEffect } from 'react';

interface DecimalInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | string;
  onChangeValue: (val: number) => void;
  baseUnit?: string;
}

const DecimalInput: React.FC<DecimalInputProps> = ({ value, onChangeValue, baseUnit, ...props }) => {
  const [localValue, setLocalValue] = useState(value === 0 && props.placeholder ? '' : value.toString());

  // Sync with external value if it changes from outside
  useEffect(() => {
    const parsedLocal = parseFloat(localValue.replace(',', '.'));
    const externalVal = typeof value === 'string' ? parseFloat(value) : value;
    
    if (parsedLocal !== externalVal && !isNaN(externalVal)) {
      setLocalValue(externalVal.toString());
    } else if (value === 0 && localValue === '') {
       // Keep it empty if it's 0 and was empty
    } else if (value === '' && localValue !== '') {
      setLocalValue('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Permitir números, comas, puntos y letras (para sufijos como 'g' o 'ml')
    if (/^[0-9.,]*\s*[a-zA-Z]*$/.test(val)) {
      setLocalValue(val);
      // Actualizar solo si es número puro para evitar NaN
      if (/^[0-9.,]+$/.test(val)) {
        const parsed = parseFloat(val.replace(',', '.'));
        if (!isNaN(parsed)) {
          onChangeValue(parsed);
        }
      } else if (val === '') {
        onChangeValue(0);
      }
    }
  };

  const handleBlur = () => {
    let rawStr = localValue.trim().toLowerCase();
    let divisor = 1;

    // Conversión automática de unidades si escriben 'g' o 'ml'
    if (baseUnit === 'kg' && rawStr.endsWith('g') && !rawStr.endsWith('kg')) {
      divisor = 1000;
      rawStr = rawStr.replace('g', '').trim();
    } else if (baseUnit === 'L' && rawStr.endsWith('ml')) {
      divisor = 1000;
      rawStr = rawStr.replace('ml', '').trim();
    } else {
      // Quitar letras restantes para el parseo
      rawStr = rawStr.replace(/[a-z]/g, '');
    }

    const parsed = parseFloat(rawStr.replace(',', '.'));
    if (!isNaN(parsed)) {
      const finalVal = parsed / divisor;
      setLocalValue(finalVal.toString());
      onChangeValue(finalVal);
    } else {
      if (props.placeholder) {
        setLocalValue('');
        onChangeValue(0);
      } else {
        setLocalValue('0');
        onChangeValue(0);
      }
    }
  };

  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
};

export default DecimalInput;
