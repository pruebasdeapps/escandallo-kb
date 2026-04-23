import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import type { Recipe, RecipeIngredient, RecipeType, Unit, LaborItem, IndirectCost, ElaborationPhase } from '../types';
import { Save, X, Plus, Trash2, ChevronDown, ChevronUp, Calculator } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import DecimalInput from '../components/DecimalInput';
import './RecipeEditor.css';

// ── Sección Colapsable (Acordeón) ──────────────────────────────────
const AccordionSection: React.FC<{ title: string; defaultOpen?: boolean; children: React.ReactNode }> = ({ title, defaultOpen = false, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <section className="accordion-section">
      <button className="accordion-toggle" onClick={() => setIsOpen(!isOpen)}>
        <h2>{title}</h2>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {isOpen && <div className="accordion-body">{children}</div>}
    </section>
  );
};

const RecipeEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { recipes, ingredients, categories, config, addRecipe, updateRecipe, addIngredient: addNewIngredientToBase } = useStore();

  const laborProfiles = config.laborProfiles || [];
  const indirectDefaults = config.indirectCostDefaults || [];

  const [recipe, setRecipe] = useState<Partial<Recipe>>({
    name: '', type: 'plato', category: categories[0] || '', image: `https://picsum.photos/seed/${Math.random()}/800/600`,
    portions: 1, portionUnit: 'ración', ingredients: [], steps: [''], targetFoodCost: 50, suggestedMargin: 100,
    prepHistory: [], totalPreps: 0, version: 1, approvalStatus: 'borrador',
    createdAt: new Date().toISOString().split('T')[0],
    laborItems: [], indirectCosts: indirectDefaults.map(d => ({ concept: d.concept, amount: d.defaultAmount })),
    elaborationPhases: [], equipment: [], criticalPoints: [],
  });

  const [showNewIngForm, setShowNewIngForm] = useState<number | null>(null);
  const [newIngData, setNewIngData] = useState({ name: '', price: 0, unit: 'kg' as Unit, supermarket: '', waste: 0 });
  const [showWasteCalc, setShowWasteCalc] = useState(false);
  const [wasteCalc, setWasteCalc] = useState({ gross: 0, net: 0 });

  // Helper: trunca cualquier cadena ISO a solo YYYY-MM-DD para los <input type="date">
  const toDateInput = (val?: string): string => {
    if (!val) return '';
    return val.substring(0, 10); // '2026-04-22T20:...' -> '2026-04-22'
  };

  useEffect(() => {
    if (id) {
      const existing = recipes.find(r => r.id === id);
      if (existing) {
        setRecipe({
          ...existing,
          // Normalizar fechas a formato YYYY-MM-DD para los campos <input type="date">
          createdAt: toDateInput(existing.createdAt),
          revisedAt: toDateInput(existing.revisedAt),
          approvedAt: toDateInput(existing.approvedAt),
          // Asegurar arrays presentes aunque la receta no los tenga
          laborItems: existing.laborItems || [],
          indirectCosts: existing.indirectCosts || indirectDefaults.map(d => ({ concept: d.concept, amount: d.defaultAmount })),
          steps: existing.steps || [],
          elaborationPhases: existing.elaborationPhases || [],
          equipment: existing.equipment || [],
          criticalPoints: existing.criticalPoints || [],
          prepHistory: existing.prepHistory || [],
        });
      }
    }
  }, [id, recipes]);

  const ingredientOptions = React.useMemo(() => {
    const opts: any[] = [];
    ingredients.forEach(i => opts.push({ value: i.id, label: i.name, group: 'Ingredientes Base' }));
    recipes.filter(r => r.type === 'semielaborado' && r.id !== id).forEach(r => opts.push({ value: r.id, label: r.name, group: 'Semielaborados' }));
    return opts;
  }, [ingredients, recipes, id]);

  const handleSave = () => {
    if (!recipe.name) return alert('El nombre es obligatorio');
    const now = new Date().toISOString().split('T')[0];
    const finalRecipe = {
      ...recipe, id: recipe.id || `rec-${Date.now()}`, lastUpdated: now, revisedAt: now,
      version: id ? (recipe.version || 1) : 1,
      hasOutdatedPrice: false,
    } as Recipe;
    if (id) updateRecipe(finalRecipe); else addRecipe(finalRecipe);
    navigate(`/recipes/${finalRecipe.id}`);
  };

  // ── Ingredientes helpers ───────────────────────────────────────
  const addIngredientRow = () => setRecipe({ ...recipe, ingredients: [...(recipe.ingredients || []), { id: '', amount: 0, unit: 'kg' }] });
  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: any) => {
    setRecipe(prev => { const n = [...(prev.ingredients || [])]; n[index] = { ...n[index], [field]: value }; return { ...prev, ingredients: n }; });
  };
  const updateMultipleIngredientFields = (index: number, updates: Partial<RecipeIngredient>) => {
    setRecipe(prev => { const n = [...(prev.ingredients || [])]; n[index] = { ...n[index], ...updates }; return { ...prev, ingredients: n }; });
  };
  const removeIngredient = (index: number) => setRecipe({ ...recipe, ingredients: recipe.ingredients?.filter((_, i) => i !== index) });

  const handleCreateNewIngredient = (index: number) => {
    if (!newIngData.name || newIngData.price <= 0) return alert('Datos de ingrediente inválidos');
    const newId = `ing-custom-${Date.now()}`;
    addNewIngredientToBase({ id: newId, name: newIngData.name, price: newIngData.price, unit: newIngData.unit, category: 'Otros', family: 'Despensa', provider: newIngData.supermarket || 'Manual', waste: 0, allergens: [], purchaseType: 'Menor (Supermercado)', supermarket: newIngData.supermarket, priceHistory: [], lastUpdated: new Date().toISOString().split('T')[0] });
    updateMultipleIngredientFields(index, { id: newId, unit: newIngData.unit });
    setShowNewIngForm(null);
    setNewIngData({ name: '', price: 0, unit: 'kg' as Unit, supermarket: '', waste: 0 });
  };

  // ── Pasos helpers ──────────────────────────────────────────────
  const addStep = () => setRecipe({ ...recipe, steps: [...(recipe.steps || []), ''] });
  const updateStep = (i: number, v: string) => { const s = [...(recipe.steps || [])]; s[i] = v; setRecipe({ ...recipe, steps: s }); };
  const removeStep = (i: number) => setRecipe({ ...recipe, steps: recipe.steps?.filter((_, idx) => idx !== i) });

  // ── Fases de elaboración ───────────────────────────────────────
  const addPhase = () => setRecipe({ ...recipe, elaborationPhases: [...(recipe.elaborationPhases || []), { name: '', duration: 0 }] });
  const updatePhase = (i: number, f: keyof ElaborationPhase, v: any) => { const p = [...(recipe.elaborationPhases || [])]; p[i] = { ...p[i], [f]: v }; setRecipe({ ...recipe, elaborationPhases: p }); };
  const removePhase = (i: number) => setRecipe({ ...recipe, elaborationPhases: recipe.elaborationPhases?.filter((_, idx) => idx !== i) });

  // ── Mano de obra ───────────────────────────────────────────────
  const addLabor = () => setRecipe({ ...recipe, laborItems: [...(recipe.laborItems || []), { profile: laborProfiles[0]?.name || '', minutes: 0, costPerHour: laborProfiles[0]?.costPerHour || 0 }] });
  const updateLabor = (i: number, f: keyof LaborItem, v: any) => { const l = [...(recipe.laborItems || [])]; l[i] = { ...l[i], [f]: v }; setRecipe({ ...recipe, laborItems: l }); };
  const removeLabor = (i: number) => setRecipe({ ...recipe, laborItems: recipe.laborItems?.filter((_, idx) => idx !== i) });

  // ── Costes indirectos ──────────────────────────────────────────
  const addIndirect = () => setRecipe({ ...recipe, indirectCosts: [...(recipe.indirectCosts || []), { concept: '', amount: 0 }] });
  const updateIndirect = (i: number, f: keyof IndirectCost, v: any) => { const c = [...(recipe.indirectCosts || [])]; c[i] = { ...c[i], [f]: v }; setRecipe({ ...recipe, indirectCosts: c }); };
  const removeIndirect = (i: number) => setRecipe({ ...recipe, indirectCosts: recipe.indirectCosts?.filter((_, idx) => idx !== i) });

  // ── Equipos ────────────────────────────────────────────────────
  const addEquipment = () => setRecipe({ ...recipe, equipment: [...(recipe.equipment || []), ''] });
  const updateEquipment = (i: number, v: string) => { const e = [...(recipe.equipment || [])]; e[i] = v; setRecipe({ ...recipe, equipment: e }); };
  const removeEquipment = (i: number) => setRecipe({ ...recipe, equipment: recipe.equipment?.filter((_, idx) => idx !== i) });

  return (
    <div className="recipe-editor fade-in">
      <header className="view-header compact">
        <div className="header-text">
          <h1>{id ? 'Editar Escandallo' : 'Nuevo Escandallo'}</h1>
          <p>Ficha técnica profesional de producto</p>
        </div>
        <div className="editor-actions">
          <button className="btn-secondary btn-sm" onClick={() => navigate(-1)}><X size={16} /> Cancelar</button>
          <button className="btn-primary btn-sm" onClick={handleSave}><Save size={16} /> Guardar</button>
        </div>
      </header>

      {/* ═══ SECCIÓN 1: ENCABEZADO ═══ */}
      <AccordionSection title="1. Identificación y Descripción" defaultOpen={true}>
        <div className="form-row">
          <div className="form-group flex-2"><label>Nombre del Plato</label><input type="text" value={recipe.name} onChange={e => setRecipe({ ...recipe, name: e.target.value })} placeholder="Ej. Paella Valenciana" /></div>
          <div className="form-group flex-1"><label>Código Interno</label><input type="text" value={recipe.code || ''} onChange={e => setRecipe({ ...recipe, code: e.target.value })} placeholder="PLA-001" /></div>
          <div className="form-group flex-1"><label>Versión</label><DecimalInput value={recipe.version || 1} onChangeValue={val => setRecipe({ ...recipe, version: val })} /></div>
        </div>
        <div className="form-row">
          <div className="form-group flex-1"><label>Categoría</label><select value={recipe.category} onChange={e => setRecipe({ ...recipe, category: e.target.value })}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div className="form-group flex-1"><label>Tipo</label><select value={recipe.type} onChange={e => setRecipe({ ...recipe, type: e.target.value as RecipeType })}><option value="plato">Plato Final</option><option value="semielaborado">Semielaborado</option></select></div>
          <div className="form-group flex-1"><label>Unidad de Venta</label><input type="text" value={recipe.saleUnit || recipe.portionUnit || 'ración'} onChange={e => setRecipe({ ...recipe, saleUnit: e.target.value, portionUnit: e.target.value })} /></div>
        </div>
        <div className="form-row">
          <div className="form-group flex-1"><label>Raciones / Rendimiento</label><DecimalInput value={recipe.portions || 0} onChangeValue={val => setRecipe({ ...recipe, portions: val })} /></div>
          <div className="form-group flex-1"><label>Margen de Ganancia (%)</label><DecimalInput value={recipe.suggestedMargin !== undefined ? recipe.suggestedMargin : 100} onChangeValue={val => setRecipe({ ...recipe, suggestedMargin: val })} /></div>
          <div className="form-group flex-1"><label>Gastos Generales (%)</label><DecimalInput value={recipe.overheads !== undefined ? recipe.overheads : (config.defaultOverheads || 0)} onChangeValue={val => setRecipe({ ...recipe, overheads: val })} /></div>
        </div>
        <div className="form-row">
          <div className="form-group flex-1"><label>Peso Bruto (g)</label><DecimalInput value={recipe.grossWeight || ''} onChangeValue={val => setRecipe({ ...recipe, grossWeight: val })} placeholder="Opcional" /></div>
          <div className="form-group flex-1"><label>Peso Neto (g)</label><DecimalInput value={recipe.netWeight || ''} onChangeValue={val => setRecipe({ ...recipe, netWeight: val })} placeholder="Opcional" /></div>
        </div>
        <div className="form-row">
          <div className="form-group flex-2"><label>Descripción</label><textarea value={recipe.description || ''} onChange={e => setRecipe({ ...recipe, description: e.target.value })} placeholder="Descripción breve del plato" rows={2} /></div>
          <div className="form-group flex-1"><label>Presentación Final</label><input type="text" value={recipe.presentation || ''} onChange={e => setRecipe({ ...recipe, presentation: e.target.value })} placeholder="Ej. Plato hondo" /></div>
        </div>
        {/* Aprobación formal */}
        <div className="form-row approval-row">
          <div className="form-group flex-1"><label>Estado</label>
            <select value={recipe.approvalStatus || 'borrador'} onChange={e => setRecipe({ ...recipe, approvalStatus: e.target.value as any })}>
              <option value="borrador">Borrador</option><option value="pendiente">Pendiente de Aprobación</option><option value="aprobado">Aprobado</option><option value="rechazado">Rechazado</option>
            </select>
          </div>
          <div className="form-group flex-1"><label>Responsable</label><input type="text" value={recipe.approvedBy || ''} onChange={e => setRecipe({ ...recipe, approvedBy: e.target.value })} placeholder="Nombre completo" /></div>
          <div className="form-group flex-1"><label>Firma Digital</label><input type="text" value={recipe.approvalSignature || ''} onChange={e => setRecipe({ ...recipe, approvalSignature: e.target.value })} placeholder="Nombre para firma" /></div>
          <div className="form-group flex-1"><label>Fecha Aprobación</label><input type="date" value={toDateInput(recipe.approvedAt)} onChange={e => setRecipe({ ...recipe, approvedAt: e.target.value })} /></div>
        </div>
      </AccordionSection>

      {/* ═══ SECCIÓN 2: INGREDIENTES ═══ */}
      <AccordionSection title="2. Ingredientes y Costes" defaultOpen={true}>
        <div className="section-header"><span></span><button className="btn-add-text" onClick={addIngredientRow}><Plus size={14} /> Añadir Ingrediente</button></div>
        <div className="ingredients-editor-list">
          {recipe.ingredients?.map((ing, idx) => (
            <div key={idx} className="modern-ingredient-row">
              <div className="ing-main">
                <div className="ing-select-wrapper">
                  <SearchableSelect 
                    options={ingredientOptions}
                    value={ing.id}
                    placeholder="Seleccionar..."
                    onAddNew={() => setShowNewIngForm(idx)}
                    onChange={(val) => {
                      if (val === 'NEW') { setShowNewIngForm(idx); }
                      else {
                        const fi = ingredients.find(i => i.id === val);
                        const fr = recipes.find(r => r.id === val);
                        updateMultipleIngredientFields(idx, { id: val, unit: (fi?.unit || fr?.portionUnit || 'kg') as any });
                      }
                    }}
                  />
                </div>
                <div className="ing-qty">
                  <DecimalInput value={ing.amount} onChangeValue={val => updateIngredient(idx, 'amount', val)} placeholder="Cant. Neta" />
                  <span className="ing-unit-tag">{ing.unit}</span>
                </div>
                <button className="btn-icon-danger" onClick={() => removeIngredient(idx)}><Trash2 size={16} /></button>
              </div>
              {showNewIngForm === idx && (
                <div className="new-ing-inline-form fade-in">
                  <div className="inline-grid">
                    <input placeholder="Nombre" value={newIngData.name} onChange={e => setNewIngData({ ...newIngData, name: e.target.value })} />
                    <div className="inline-price">
                      <DecimalInput placeholder="Precio" value={newIngData.price || ''} onChangeValue={val => setNewIngData({ ...newIngData, price: val })} />
                      <select value={newIngData.unit} onChange={e => setNewIngData({ ...newIngData, unit: e.target.value as Unit })}><option value="kg">kg</option><option value="L">L</option><option value="ud">ud</option></select>
                    </div>
                    <div className="inline-waste-row" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                        <DecimalInput placeholder="Merma %" value={newIngData.waste || ''} onChangeValue={val => setNewIngData({ ...newIngData, waste: val })} />
                        <button className="btn-icon-sm" onClick={() => setShowWasteCalc(!showWasteCalc)}><Calculator size={14} /></button>
                      </div>
                      {showWasteCalc && (
                        <div className="inline-calc-pop" style={{ padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <DecimalInput placeholder="Bruto" value={wasteCalc.gross || ''} onChangeValue={val => setWasteCalc({ ...wasteCalc, gross: val })} />
                          <DecimalInput placeholder="Neto" value={wasteCalc.net || ''} onChangeValue={val => setWasteCalc({ ...wasteCalc, net: val })} />
                          <button className="btn-save-inline" style={{ padding: '0.25rem' }} onClick={() => {
                            if (wasteCalc.gross > 0) {
                              const w = ((wasteCalc.gross - wasteCalc.net) / wasteCalc.gross) * 100;
                              setNewIngData({ ...newIngData, waste: parseFloat(w.toFixed(2)) });
                              setShowWasteCalc(false);
                            }
                          }}>OK</button>
                        </div>
                      )}
                    </div>
                    <select value={newIngData.supermarket || ''} onChange={e => { if (e.target.value === 'ADD_NEW') { const n = prompt('Supermercado:'); if (n) setNewIngData({ ...newIngData, supermarket: n }); } else setNewIngData({ ...newIngData, supermarket: e.target.value }); }}>
                      <option value="">Súper...</option><option value="Mercadona">Mercadona</option><option value="Día">Día</option><option value="Aldi">Aldi</option><option value="Covirán">Covirán</option><option value="ADD_NEW">+ Nuevo</option>
                      {newIngData.supermarket && !['Mercadona', 'Día', 'Aldi', 'Covirán'].includes(newIngData.supermarket) && <option value={newIngData.supermarket}>{newIngData.supermarket}</option>}
                    </select>
                    <div className="inline-actions">
                      <button className="btn-save-inline" onClick={() => handleCreateNewIngredient(idx)}>Crear</button>
                      <button className="btn-cancel-inline" onClick={() => setShowNewIngForm(null)}>X</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </AccordionSection>

      {/* ═══ SECCIÓN 3: ELABORACIÓN ═══ */}
      <AccordionSection title="3. Elaboración y Proceso">
        <h3 className="sub-title">Pasos de Elaboración</h3>
        <div className="section-header"><span></span><button className="btn-add-text" onClick={addStep}><Plus size={14} /> Añadir Paso</button></div>
        <div className="steps-list-editor">
          {recipe.steps?.map((step, idx) => (
            <div key={idx} className="modern-step-row">
              <span className="step-count">{idx + 1}</span>
              <textarea value={step} onChange={e => updateStep(idx, e.target.value)} placeholder="Instrucciones del paso..." />
              <button className="btn-icon-danger" onClick={() => removeStep(idx)}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>

        <h3 className="sub-title mt-1">Fases de Producción</h3>
        <div className="section-header"><span></span><button className="btn-add-text" onClick={addPhase}><Plus size={14} /> Añadir Fase</button></div>
        <div className="editable-list">
          {recipe.elaborationPhases?.map((phase, idx) => (
            <div key={idx} className="editable-row">
              <input className="flex-2" type="text" placeholder="Nombre de fase" value={phase.name} onChange={e => updatePhase(idx, 'name', e.target.value)} />
              <div style={{ width: 70 }}><DecimalInput placeholder="Min" value={phase.duration || ''} onChangeValue={val => updatePhase(idx, 'duration', val)} /></div>
              <input style={{ width: 90 }} type="text" placeholder="Temp." value={phase.temperature || ''} onChange={e => updatePhase(idx, 'temperature', e.target.value)} />
              <button className="btn-icon-danger" onClick={() => removePhase(idx)}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>

        <h3 className="sub-title mt-1">Equipos Necesarios</h3>
        <div className="section-header"><span></span><button className="btn-add-text" onClick={addEquipment}><Plus size={14} /> Añadir</button></div>
        <div className="editable-list">
          {recipe.equipment?.map((eq, idx) => (
            <div key={idx} className="editable-row">
              <input className="flex-2" type="text" placeholder="Equipo" value={eq} onChange={e => updateEquipment(idx, e.target.value)} />
              <button className="btn-icon-danger" onClick={() => removeEquipment(idx)}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>

        <div className="form-row mt-1">
          <div className="form-group flex-1"><label>Tiempo Total (min)</label><DecimalInput value={recipe.totalTime || ''} onChangeValue={val => setRecipe({ ...recipe, totalTime: val })} /></div>
          <div className="form-group flex-2"><label>Notas de Emplatado</label><input type="text" value={recipe.platingNotes || ''} onChange={e => setRecipe({ ...recipe, platingNotes: e.target.value })} placeholder="Instrucciones de montaje" /></div>
        </div>
      </AccordionSection>

      {/* ═══ SECCIÓN 4: MANO DE OBRA E INDIRECTOS ═══ */}
      <AccordionSection title="4. Mano de Obra e Indirectos">
        <h3 className="sub-title">Mano de Obra Directa</h3>
        <div className="section-header"><span></span><button className="btn-add-text" onClick={addLabor}><Plus size={14} /> Añadir M.O.</button></div>
        <div className="editable-list">
          {recipe.laborItems?.map((item, idx) => (
            <div key={idx} className="editable-row">
              <select className="flex-2" value={item.profile} onChange={e => {
                const prof = laborProfiles.find(p => p.name === e.target.value);
                updateLabor(idx, 'profile', e.target.value);
                if (prof) updateLabor(idx, 'costPerHour', prof.costPerHour);
              }}>
                <option value="">Perfil...</option>
                {laborProfiles.map(p => <option key={p.id} value={p.name}>{p.name} ({p.costPerHour} €/h)</option>)}
              </select>
              <div style={{ width: 70 }}><DecimalInput placeholder="Min" value={item.minutes || ''} onChangeValue={val => updateLabor(idx, 'minutes', val)} /></div>
              <span className="labor-cost-tag">{((item.minutes / 60) * item.costPerHour).toFixed(2)} €</span>
              <button className="btn-icon-danger" onClick={() => removeLabor(idx)}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>

        <h3 className="sub-title mt-1">Costes Indirectos (por unidad de venta)</h3>
        <div className="section-header"><span></span><button className="btn-add-text" onClick={addIndirect}><Plus size={14} /> Añadir</button></div>
        <div className="editable-list">
          {recipe.indirectCosts?.map((item, idx) => (
            <div key={idx} className="editable-row">
              <input className="flex-2" type="text" placeholder="Concepto" value={item.concept} onChange={e => updateIndirect(idx, 'concept', e.target.value)} />
              <div className="input-with-suffix">
                <DecimalInput placeholder="0.00" value={item.amount || ''} onChangeValue={val => updateIndirect(idx, 'amount', val)} />
                <span className="suffix">€</span>
              </div>
              <button className="btn-icon-danger" onClick={() => removeIndirect(idx)}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <div className="indirect-total">
          Total Indirectos: <strong>{(recipe.indirectCosts || []).reduce((s, c) => s + c.amount, 0).toFixed(2)} €/ud</strong>
        </div>
      </AccordionSection>

      {/* ═══ SECCIÓN 5: CALIDAD Y CONTROL ═══ */}
      <AccordionSection title="5. Calidad, Control y Observaciones">
        <div className="form-row">
          <div className="form-group flex-1"><label>Peso por Ración (g)</label><DecimalInput value={recipe.exactPortionWeight || ''} onChangeValue={val => setRecipe({ ...recipe, exactPortionWeight: val })} /></div>
          <div className="form-group flex-1"><label>Tolerancia (%)</label><DecimalInput value={recipe.tolerancePercent || ''} onChangeValue={val => setRecipe({ ...recipe, tolerancePercent: val })} /></div>
          <div className="form-group flex-1"><label>Temp. de Servicio</label><input type="text" value={recipe.servingTemp || ''} onChange={e => setRecipe({ ...recipe, servingTemp: e.target.value })} placeholder="Ej. 65-70 °C" /></div>
        </div>
        <div className="form-row">
          <div className="form-group flex-1"><label>Criterios de Rechazo</label><textarea value={recipe.rejectionCriteria || ''} onChange={e => setRecipe({ ...recipe, rejectionCriteria: e.target.value })} rows={2} placeholder="Ej. Temperatura inferior a 60 °C" /></div>
          <div className="form-group flex-1"><label>Estándar de Calidad</label><textarea value={recipe.qualityStandard || ''} onChange={e => setRecipe({ ...recipe, qualityStandard: e.target.value })} rows={2} placeholder="Objetivo de calidad esperado" /></div>
        </div>
        <div className="form-row">
          <div className="form-group flex-1"><label>Notas Operativas</label><textarea value={recipe.operationalNotes || ''} onChange={e => setRecipe({ ...recipe, operationalNotes: e.target.value })} rows={2} /></div>
          <div className="form-group flex-1"><label>Incidencias Frecuentes</label><textarea value={recipe.frequentIssues || ''} onChange={e => setRecipe({ ...recipe, frequentIssues: e.target.value })} rows={2} /></div>
        </div>
        <div className="form-row">
          <div className="form-group flex-1"><label>Instrucciones de Conservación</label><input type="text" value={recipe.conservationNotes || ''} onChange={e => setRecipe({ ...recipe, conservationNotes: e.target.value })} /></div>
          <div className="form-group flex-1"><label>Próxima Revisión</label><input type="date" value={toDateInput(recipe.nextRevisionDate)} onChange={e => setRecipe({ ...recipe, nextRevisionDate: e.target.value })} /></div>
        </div>
      </AccordionSection>
    </div>
  );
};

export default RecipeEditor;
