import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, Database, Save, HelpCircle, Calculator, Edit2, Check, X as XIcon, ArrowLeft, Plus, Trash2, Users, Receipt } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { LaborProfile, IndirectCostDefault } from '../types';
import DecimalInput from '../components/DecimalInput';
import './Settings.css';

// ── FormulaItem (edición individual de fórmulas) ───────────────────

interface FormulaItemProps {
  label: string;
  value: string;
  tooltip: string;
  onSave: (val: string) => void;
}

const FormulaItem: React.FC<FormulaItemProps> = ({ label, value, tooltip, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value || '');

  useEffect(() => { setTempValue(value || ''); }, [value]);

  const handleSave = () => { onSave(tempValue); setIsEditing(false); };

  return (
    <div className="formula-item-v2">
      <div className="formula-header">
        <label>{label}</label>
        <div className="tooltip-wrapper" title={tooltip}>
          <HelpCircle size={14} className="help-icon" />
        </div>
      </div>
      <div className="formula-control">
        {isEditing ? (
          <>
            <input type="text" value={tempValue} onChange={e => setTempValue(e.target.value)} className="formula-input" autoFocus />
            <div className="formula-actions">
              <button className="btn-icon-sm success" onClick={handleSave} title="Guardar"><Check size={14} /></button>
              <button className="btn-icon-sm" onClick={() => setIsEditing(false)} title="Cancelar"><XIcon size={14} /></button>
            </div>
          </>
        ) : (
          <>
            <div className="formula-display"><code>{value || 'Sin configurar'}</code></div>
            <button className="btn-icon-sm" onClick={() => setIsEditing(true)} title="Editar"><Edit2 size={14} /></button>
          </>
        )}
      </div>
    </div>
  );
};

// ── Componente Principal ───────────────────────────────────────────

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { config, updateConfig } = useStore();
  
  const [localConfig, setLocalConfig] = useState(config);
  const [calcRowIdx, setCalcRowIdx] = useState<number | null>(null);
  const [calcData, setCalcData] = useState({ invoice: 0, portions: 0 });
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => { if (config) setLocalConfig(config); }, [config]);

  const handleSave = () => {
    updateConfig(localConfig);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleExport = () => {
    const data = localStorage.getItem('escandallo_data');
    const blob = new Blob([data || ''], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `escandallo_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const safeFormulas = useMemo(() => {
    return localConfig?.formulas || config?.formulas || {
      realCost: 'Precio / (1 - Merma/100)',
      portionCost: 'Total / Raciones',
      suggestedPrice: 'Coste / Margen'
    };
  }, [localConfig?.formulas, config?.formulas]);

  const laborProfiles = localConfig?.laborProfiles || [];
  const indirectDefaults = localConfig?.indirectCostDefaults || [];

  // ── Perfiles de Mano de Obra ─────────────────────────────────────

  const addLaborProfile = () => {
    const newProfile: LaborProfile = {
      id: `lp-${Date.now()}`,
      name: '',
      costPerHour: 0
    };
    setLocalConfig({
      ...localConfig,
      laborProfiles: [...laborProfiles, newProfile]
    });
  };

  const updateLaborProfile = (index: number, field: keyof LaborProfile, value: string | number) => {
    const updated = [...laborProfiles];
    updated[index] = { ...updated[index], [field]: value };
    setLocalConfig({ ...localConfig, laborProfiles: updated });
  };

  const removeLaborProfile = (index: number) => {
    setLocalConfig({
      ...localConfig,
      laborProfiles: laborProfiles.filter((_, i) => i !== index)
    });
  };

  // ── Costes Indirectos por Defecto ────────────────────────────────

  const addIndirectDefault = () => {
    const newItem: IndirectCostDefault = { concept: '', defaultAmount: 0 };
    setLocalConfig({
      ...localConfig,
      indirectCostDefaults: [...indirectDefaults, newItem]
    });
  };

  const updateIndirectDefault = (index: number, field: keyof IndirectCostDefault, value: string | number) => {
    const updated = [...indirectDefaults];
    updated[index] = { ...updated[index], [field]: value };
    setLocalConfig({ ...localConfig, indirectCostDefaults: updated });
  };

  const removeIndirectDefault = (index: number) => {
    setLocalConfig({
      ...localConfig,
      indirectCostDefaults: indirectDefaults.filter((_, i) => i !== index)
    });
  };

  if (!localConfig) {
    return <div className="loading-state">Cargando configuración...</div>;
  }

  return (
    <div className="settings-view fade-in">
      <header className="view-header">
        <div className="back-btn-container">
          <button className="btn-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> Volver
          </button>
        </div>
        <div className="header-text">
          <h1>Configuración</h1>
          <p>Ajustes globales, fórmulas, perfiles de mano de obra y costes indirectos</p>
        </div>
        <button className={`btn-primary btn-sm ${isSaved ? 'success' : ''}`} onClick={handleSave}>
          <Save size={16} /> {isSaved ? '¡Guardado!' : 'Guardar Cambios'}
        </button>
      </header>

      <div className="settings-content">
        {/* ── Columna Izquierda ──────────────────────────────────── */}
        <div className="settings-column">
          <section className="settings-card">
            <h2><SettingsIcon size={20} /> Preferencias</h2>
            <div className="form-group">
              <label>Moneda</label>
              <input type="text" value={localConfig.currency || '€'} onChange={e => setLocalConfig({ ...localConfig, currency: e.target.value })} />
            </div>
            <div className="form-group">
              <label>IVA por defecto (%)</label>
              <DecimalInput value={localConfig.iva !== undefined ? localConfig.iva : 20} onChangeValue={val => setLocalConfig({ ...localConfig, iva: val })} />
            </div>
            <div className="form-group">
              <label>Margen Objetivo (%)</label>
              <DecimalInput value={localConfig.defaultMargin !== undefined ? localConfig.defaultMargin : 100} onChangeValue={val => setLocalConfig({ ...localConfig, defaultMargin: val })} />
            </div>
            <div className="form-group">
              <label>Costes Generales (%)</label>
              <DecimalInput value={localConfig.defaultOverheads || 15} onChangeValue={val => setLocalConfig({ ...localConfig, defaultOverheads: val })} />
            </div>
          </section>

          <section className="settings-card">
            <h2><Database size={20} /> Datos y Respaldo</h2>
            <div className="backup-actions">
              <button className="btn-secondary" onClick={handleExport}>Exportar Backup JSON</button>
              <p className="hint">Tus datos se guardan automáticamente en el navegador.</p>
            </div>
          </section>

          <section className="settings-card">
            <h2><Calculator size={20} /> Fórmulas y Cálculos</h2>
            <div className="formulas-grid">
              <FormulaItem
                label="Fórmula Coste Real (con Merma)"
                value={safeFormulas.realCost}
                tooltip="El coste real considera que el precio pagado se distribuye solo sobre la parte aprovechable (limpia) del producto."
                onSave={(val) => {
                  const nc = { ...localConfig, formulas: { ...safeFormulas, realCost: val } };
                  setLocalConfig(nc); updateConfig(nc);
                }}
              />
              <FormulaItem
                label="Fórmula Coste Ración"
                value={safeFormulas.portionCost}
                tooltip="Suma el coste de cada ingrediente (ya con merma) y lo divide por el número de raciones configuradas."
                onSave={(val) => {
                  const nc = { ...localConfig, formulas: { ...safeFormulas, portionCost: val } };
                  setLocalConfig(nc); updateConfig(nc);
                }}
              />
              <FormulaItem
                label="Fórmula PVP Sugerido"
                value={safeFormulas.suggestedPrice}
                tooltip="Calcula el precio de venta necesario para que el Food Cost represente el porcentaje objetivo marcado."
                onSave={(val) => {
                  const nc = { ...localConfig, formulas: { ...safeFormulas, suggestedPrice: val } };
                  setLocalConfig(nc); updateConfig(nc);
                }}
              />
            </div>
            <div className="merma-explanation mt-1">
              <h3>Entendiendo la Merma</h3>
              <p>La merma es la pérdida de peso o volumen de un producto durante su limpieza, descongelación o cocción.</p>
              <div className="formula-box"><code>% Merma = ((Peso Bruto - Peso Neto) / Peso Bruto) x 100</code></div>
              <p className="hint">Ejemplo: Si compras 1kg de cebollas y tras pelarlas quedan 800g, la merma es del 20%.</p>
            </div>
          </section>
        </div>

        {/* ── Columna Derecha ───────────────────────────────────── */}
        <div className="settings-column">
          <section className="settings-card">
            <div className="section-header">
              <h2><Users size={20} /> Perfiles de Mano de Obra</h2>
              <button className="btn-add-text" onClick={addLaborProfile}><Plus size={14} /> Añadir Perfil</button>
            </div>
            <p className="hint mb-1">Define los perfiles profesionales y su coste/hora. Se usarán como opciones al crear un escandallo.</p>
            <div className="editable-list">
              {laborProfiles.map((profile, idx) => (
                <div key={profile.id || idx} className="editable-row">
                  <input
                    type="text"
                    placeholder="Nombre del perfil"
                    value={profile.name}
                    onChange={e => updateLaborProfile(idx, 'name', e.target.value)}
                    className="flex-2"
                  />
                  <div className="input-with-suffix">
                    <DecimalInput
                      placeholder="0"
                      value={profile.costPerHour || ''}
                      onChangeValue={val => updateLaborProfile(idx, 'costPerHour', val)}
                    />
                    <span className="suffix">€/h</span>
                  </div>
                  <button className="btn-icon-danger" onClick={() => removeLaborProfile(idx)}><Trash2 size={14} /></button>
                </div>
              ))}
              {laborProfiles.length === 0 && (
                <p className="empty-hint">No hay perfiles definidos. Pulsa "Añadir Perfil" para crear uno.</p>
              )}
            </div>
          </section>

          <section className="settings-card">
            <div className="section-header">
              <h2><Receipt size={20} /> Costes Indirectos por Defecto</h2>
              <button className="btn-add-text" onClick={addIndirectDefault}><Plus size={14} /> Añadir</button>
            </div>
            <p className="hint mb-1">Estos costes se cargarán automáticamente en cada nuevo escandallo. El importe es por unidad de venta.</p>
            <div className="editable-list">
              {indirectDefaults.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
                  <div className="editable-row" style={{ margin: 0, padding: 0, background: 'transparent', border: 'none' }}>
                    <input
                      type="text"
                      placeholder="Concepto"
                      value={item.concept}
                      onChange={e => updateIndirectDefault(idx, 'concept', e.target.value)}
                      className="flex-2"
                    />
                    <div className="input-with-suffix">
                      <DecimalInput
                        placeholder="0.00"
                        value={item.defaultAmount || ''}
                        onChangeValue={val => updateIndirectDefault(idx, 'defaultAmount', val)}
                      />
                      <span className="suffix">€/ud</span>
                    </div>
                    <button className="btn-icon-sm" onClick={() => setCalcRowIdx(calcRowIdx === idx ? null : idx)} title="Calcular desde Factura"><Calculator size={14} /></button>
                    <button className="btn-icon-danger" onClick={() => removeIndirectDefault(idx)}><Trash2 size={14} /></button>
                  </div>
                  {calcRowIdx === idx && (
                    <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem', background: 'var(--bg-card)', borderRadius: '4px', alignItems: 'flex-end' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.75rem' }}>Factura Total (€)</label>
                        <DecimalInput value={calcData.invoice || ''} onChangeValue={val => setCalcData(prev => ({ ...prev, invoice: val }))} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.75rem' }}>Raciones/Mes</label>
                        <DecimalInput value={calcData.portions || ''} onChangeValue={val => setCalcData(prev => ({ ...prev, portions: val }))} />
                      </div>
                      <button className="btn-secondary btn-sm" onClick={() => {
                        if (calcData.invoice > 0 && calcData.portions > 0) {
                          const costPerPortion = calcData.invoice / calcData.portions;
                          updateIndirectDefault(idx, 'defaultAmount', parseFloat(costPerPortion.toFixed(4)));
                          setCalcRowIdx(null);
                        } else {
                          alert('Introduce valores válidos mayores a 0.');
                        }
                      }}>Aplicar</button>
                    </div>
                  )}
                </div>
              ))}
              {indirectDefaults.length === 0 && (
                <p className="empty-hint">No hay costes indirectos definidos.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Settings;
