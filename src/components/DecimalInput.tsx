import React, { useState, useEffect } from 'react';

interface DecimalInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | string;
  onChangeValue: (val: number) => void;
}

const DecimalInput: React.FC<DecimalInputProps> = ({ value, onChangeValue, ...props }) => {
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
    // Permitir solo números, comas y puntos
    if (/^[0-9.,]*$/.test(val)) {
      setLocalValue(val);
      const parsed = parseFloat(val.replace(',', '.'));
      if (!isNaN(parsed)) {
        onChangeValue(parsed);
      } else if (val === '') {
        onChangeValue(0);
      }
    }
  };

  const handleBlur = () => {
    const parsed = parseFloat(localValue.replace(',', '.'));
    if (!isNaN(parsed)) {
      setLocalValue(parsed.toString());
      onChangeValue(parsed);
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
