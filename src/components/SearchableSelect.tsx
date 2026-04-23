import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Plus } from 'lucide-react';
import './SearchableSelect.css';

export interface Option {
  value: string;
  label: string;
  group?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onAddNew?: () => void;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder = 'Buscar...', onAddNew }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(() => options.find(o => o.value === value), [options, value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const lowerSearch = searchTerm.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(lowerSearch));
  }, [options, searchTerm]);

  // Group options
  const groupedOptions = useMemo(() => {
    const groups: Record<string, Option[]> = { 'Sin grupo': [] };
    filteredOptions.forEach(opt => {
      const g = opt.group || 'Sin grupo';
      if (!groups[g]) groups[g] = [];
      groups[g].push(opt);
    });
    return groups;
  }, [filteredOptions]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="searchable-select-wrapper" ref={wrapperRef}>
      <div 
        className={`searchable-select-display ${isOpen ? 'focused' : ''}`}
        onClick={() => { setIsOpen(!isOpen); setSearchTerm(''); }}
      >
        <span className={selectedOption ? 'selected-text' : 'placeholder-text'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className="dropdown-icon" />
      </div>

      {isOpen && (
        <div className="searchable-select-dropdown fade-in">
          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input 
              type="text" 
              autoFocus 
              placeholder="Escribe para buscar..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          </div>
          
          <div className="options-list">
            {onAddNew && (
              <div className="option-item add-new" onClick={() => handleSelect('NEW')}>
                <Plus size={14} /> Crear nuevo ingrediente...
              </div>
            )}
            
            {Object.keys(groupedOptions).map(groupName => {
              const opts = groupedOptions[groupName];
              if (opts.length === 0) return null;
              
              return (
                <div key={groupName} className="option-group">
                  {groupName !== 'Sin grupo' && <div className="group-label">{groupName}</div>}
                  {opts.map(opt => (
                    <div 
                      key={opt.value} 
                      className={`option-item ${opt.value === value ? 'selected' : ''}`}
                      onClick={() => handleSelect(opt.value)}
                    >
                      {opt.label}
                    </div>
                  ))}
                </div>
              );
            })}
            
            {filteredOptions.length === 0 && (
              <div className="no-options">No se encontraron resultados</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
