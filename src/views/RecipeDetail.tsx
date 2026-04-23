import React, { useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { calculateRecipeCosts, calculateIngredientCost, formatCurrency, formatPercentage, getRecipeAllergens } from '../utils/calculations';
import { ArrowLeft, Edit, Trash2, Printer, Share2, ShieldAlert, CheckCircle2, Clock, Thermometer, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './RecipeDetail.css';

const RecipeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const detailRef = useRef<HTMLDivElement>(null);
  const { recipes, ingredients, deleteRecipe, updateRecipe, config } = useStore();
  const recipe = recipes.find(r => r.id === id);

  if (!recipe) {
    return <div className="error-view"><p>Receta no encontrada.</p><button onClick={() => navigate('/recipes')}>Volver al listado</button></div>;
  }

  const costs = calculateRecipeCosts(recipe, ingredients, recipes, config);
  const allergens = getRecipeAllergens(recipe, ingredients, recipes);
  const laborTotal = (recipe.laborItems || []).reduce((s, i) => s + (i.minutes / 60) * i.costPerHour, 0);
  const indirectTotal = (recipe.indirectCosts || []).reduce((s, i) => s + i.amount, 0);

  const handleRegisterPrep = () => {
    const d = new Date();
    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    updateRecipe({ ...recipe, totalPreps: (recipe.totalPreps || 0) + 1, prepHistory: [{ date: dateStr, portions: recipe.portions, costAtTime: costs.portionCost }, ...(recipe.prepHistory || [])] });
    alert('Preparación registrada correctamente.');
  };

  const handleDelete = () => {
    if (window.confirm('¿Eliminar este escandallo?')) { deleteRecipe(recipe.id); navigate(recipe.type === 'plato' ? '/recipes' : '/semi-elaborated'); }
  };

  const exportPDF = async () => {
    if (!detailRef.current) return;
    const actions = document.querySelector('.detail-nav') as HTMLElement;
    if (actions) actions.style.display = 'none';
    try {
      const canvas = await html2canvas(detailRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Escandallo_${recipe.name.replace(/\s+/g, '_')}.pdf`);
    } catch { alert('Error al generar PDF.'); }
    finally { if (actions) actions.style.display = 'flex'; }
  };

  const statusLabel: Record<string, string> = { borrador: 'Borrador', pendiente: 'Pendiente', aprobado: 'Aprobado', rechazado: 'Rechazado' };

  return (
    <div className="recipe-detail-view fade-in" ref={detailRef}>
      <nav className="detail-nav">
        <button onClick={() => navigate(-1)} className="btn-back"><ArrowLeft size={18} /> Volver</button>
        <div className="detail-actions">
          <button onClick={() => window.print()} className="icon-btn" title="Imprimir"><Printer size={20} /></button>
          <button onClick={exportPDF} className="icon-btn highlight" title="PDF"><Share2 size={20} /></button>
          <button onClick={handleRegisterPrep} className="icon-btn success" title="Registrar Preparación"><CheckCircle2 size={20} /></button>
          <Link to={`/recipes/edit/${recipe.id}`} className="icon-btn edit" title="Editar"><Edit size={20} /></Link>
          <button onClick={handleDelete} className="icon-btn delete" title="Eliminar"><Trash2 size={20} /></button>
        </div>
      </nav>

      <div className="detail-grid">
        {/* ═══ BLOQUE 1: ENCABEZADO ═══ */}
        <header className="detail-header">
          <div className="header-info">
            <div className="header-badges">
              <span className="badge-type">{recipe.type === 'plato' ? 'Plato Final' : 'Semielaborado'}</span>
              {recipe.approvalStatus && <span className={`badge-status ${recipe.approvalStatus}`}>{statusLabel[recipe.approvalStatus] || recipe.approvalStatus}</span>}
              {recipe.code && <span className="badge-code">{recipe.code}</span>}
              {recipe.version && <span className="badge-version">v{recipe.version}</span>}
            </div>
            <h1>{recipe.name}</h1>
            <p>{recipe.category} · {recipe.portions} {recipe.portionUnit}</p>
            {recipe.description && <p className="recipe-description">{recipe.description}</p>}
            {recipe.approvedBy && <p className="approval-line">Aprobado por: <strong>{recipe.approvedBy}</strong>{recipe.approvedAt && ` — ${recipe.approvedAt}`}</p>}
          </div>
          <div className="header-image"><img src={recipe.image} alt={recipe.name} /></div>
        </header>

        {allergens.length > 0 && (
          <section className="allergens-panel">
            <h2><ShieldAlert size={20} /> Alérgenos</h2>
            <div className="allergens-list">{allergens.map(a => <span key={a} className="allergen-tag">{a}</span>)}</div>
          </section>
        )}

        {recipe.hasOutdatedPrice && (
          <div className="outdated-price-warning" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
            <AlertCircle size={20} />
            <div>
              <strong>Costes Desactualizados</strong>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>El precio de uno o más ingredientes ha cambiado. Guarda el escandallo en el editor para fijar los nuevos costes.</p>
            </div>
          </div>
        )}

        {/* ═══ BLOQUE 2: RESUMEN ECONÓMICO ═══ */}
        <div className="costs-summary-cards">
          <div className="cost-card"><span>Materia Prima/Ración</span><h2>{formatCurrency(costs.portionCost, config.currency)}</h2></div>
          <div className="cost-card"><span>Mano de Obra/Ración</span><h2>{formatCurrency(costs.laborCost, config.currency)}</h2></div>
          <div className="cost-card"><span>Indirectos/Ud</span><h2>{formatCurrency(costs.indirectCost, config.currency)}</h2></div>
          <div className="cost-card accent"><span>Coste Total Producción</span><h2>{formatCurrency(costs.totalProductionCost, config.currency)}</h2></div>
          <div className="cost-card highlight"><span>PVP Sugerido (IVA {config.iva}%)</span><h2>{formatCurrency(costs.priceWithVat, config.currency)}</h2><small>Base: {formatCurrency(costs.priceWithoutVat, config.currency)}</small></div>
          <div className="cost-card"><span>Margen Bruto</span><h2>{formatCurrency(costs.grossMarginEuros, config.currency)}</h2><small>{formatPercentage(costs.grossMarginPercent)}</small></div>
          <div className="cost-card"><span>Food Cost</span><h2 className={costs.foodCostPercentage > 35 ? 'danger' : 'success'}>{formatPercentage(costs.foodCostPercentage)}</h2></div>
          <div className="cost-card"><span>Coste Lote ({recipe.portions} ud)</span><h2>{formatCurrency(costs.costPerBatch, config.currency)}</h2></div>
        </div>

        {/* ═══ BLOQUE 3: INGREDIENTES ═══ */}
        <section className="ingredients-breakdown">
          <h2>Ingredientes y Costes</h2>
          <table className="breakdown-table">
            <thead><tr><th>Ingrediente</th><th>Cantidad</th><th>Coste Unit.</th><th>Coste Total</th></tr></thead>
            <tbody>
              {recipe.ingredients.map((item, idx) => {
                const bi = ingredients.find(i => i.id === item.id);
                const si = recipes.find(r => r.id === item.id);
                const name = bi?.name || si?.name || 'Desconocido';
                const uc = bi ? bi.price / (1 - bi.waste / 100) : (si ? calculateRecipeCosts(si, ingredients, recipes).portionCost : 0);
                const tc = calculateIngredientCost(item, ingredients, recipes);
                return <tr key={idx}><td>{name} {si && <span className="semi-label">(Semielab.)</span>}</td><td>{item.amount} {item.unit}</td><td>{formatCurrency(uc)}</td><td className="font-bold">{formatCurrency(tc)}</td></tr>;
              })}
            </tbody>
            <tfoot><tr><td colSpan={3}>Coste Total Materia Prima</td><td className="total-value">{formatCurrency(costs.grossCost)}</td></tr></tfoot>
          </table>
        </section>

        {/* ═══ BLOQUE 4: ELABORACIÓN ═══ */}
        <section className="recipe-steps">
          <h2>Elaboración</h2>
          {recipe.elaborationPhases && recipe.elaborationPhases.length > 0 && (
            <div className="phases-grid">
              {recipe.elaborationPhases.map((p, i) => (
                <div key={i} className="phase-card">
                  <strong>{p.name}</strong>
                  <div className="phase-meta">
                    <span><Clock size={14} /> {p.duration} min</span>
                    {p.temperature && <span><Thermometer size={14} /> {p.temperature}</span>}
                  </div>
                  {p.notes && <p className="phase-notes">{p.notes}</p>}
                </div>
              ))}
            </div>
          )}
          <ol className="steps-list">
            {recipe.steps.map((step, idx) => <li key={idx}><span className="step-num">{idx + 1}</span><p>{step}</p></li>)}
          </ol>
          {recipe.equipment && recipe.equipment.length > 0 && (
            <div className="equipment-list"><h3>Equipos</h3><div className="tags">{recipe.equipment.map((e, i) => <span key={i} className="eq-tag">{e}</span>)}</div></div>
          )}
          {recipe.platingNotes && <div className="plating-notes"><h3>Emplatado</h3><p>{recipe.platingNotes}</p></div>}
        </section>

        {/* ═══ BLOQUE 4b: MANO DE OBRA E INDIRECTOS ═══ */}
        {((recipe.laborItems && recipe.laborItems.length > 0) || (recipe.indirectCosts && recipe.indirectCosts.length > 0)) && (
          <section className="labor-indirect-section">
            {recipe.laborItems && recipe.laborItems.length > 0 && (
              <div className="labor-block">
                <h2>Mano de Obra</h2>
                <table className="breakdown-table compact"><thead><tr><th>Perfil</th><th>Tiempo</th><th>€/h</th><th>Coste</th></tr></thead>
                  <tbody>{recipe.laborItems.map((l, i) => <tr key={i}><td>{l.profile}</td><td>{l.minutes} min</td><td>{l.costPerHour} €</td><td className="font-bold">{((l.minutes / 60) * l.costPerHour).toFixed(2)} €</td></tr>)}</tbody>
                  <tfoot><tr><td colSpan={3}>Total M.O.</td><td className="total-value">{laborTotal.toFixed(2)} €</td></tr></tfoot>
                </table>
              </div>
            )}
            {recipe.indirectCosts && recipe.indirectCosts.length > 0 && (
              <div className="indirect-block">
                <h2>Costes Indirectos</h2>
                <table className="breakdown-table compact"><thead><tr><th>Concepto</th><th>€/ud</th></tr></thead>
                  <tbody>{recipe.indirectCosts.map((c, i) => <tr key={i}><td>{c.concept}</td><td className="font-bold">{c.amount.toFixed(2)} €</td></tr>)}</tbody>
                  <tfoot><tr><td>Total Indirectos</td><td className="total-value">{indirectTotal.toFixed(2)} €</td></tr></tfoot>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ═══ BLOQUE 5: CALIDAD Y CONTROL ═══ */}
        {(recipe.exactPortionWeight || recipe.servingTemp || recipe.rejectionCriteria || recipe.conservationNotes || recipe.operationalNotes) && (
          <section className="quality-section">
            <h2><AlertCircle size={20} /> Control de Calidad</h2>
            <div className="quality-grid">
              {recipe.exactPortionWeight && <div className="quality-item"><span>Peso/Ración</span><strong>{recipe.exactPortionWeight} g</strong>{recipe.tolerancePercent && <small>±{recipe.tolerancePercent}%</small>}</div>}
              {recipe.servingTemp && <div className="quality-item"><span>Temp. Servicio</span><strong>{recipe.servingTemp}</strong></div>}
              {recipe.rejectionCriteria && <div className="quality-item full"><span>Criterios de Rechazo</span><p>{recipe.rejectionCriteria}</p></div>}
              {recipe.conservationNotes && <div className="quality-item full"><span>Conservación</span><p>{recipe.conservationNotes}</p></div>}
              {recipe.operationalNotes && <div className="quality-item full"><span>Notas Operativas</span><p>{recipe.operationalNotes}</p></div>}
              {recipe.frequentIssues && <div className="quality-item full"><span>Incidencias Frecuentes</span><p>{recipe.frequentIssues}</p></div>}
            </div>
          </section>
        )}

        {/* ═══ ANEXO IMPRIMIBLE: RESUMEN DE CÁLCULO ═══ */}
        <section className="print-only-summary">
          <h2>Resumen de Cálculo y Fórmulas</h2>
          <div className="summary-grid">
            <div className="summary-col">
              <h3>Desglose de Costes (Por Ración)</h3>
              <ul>
                <li><span>Materia Prima:</span> <strong>{formatCurrency(costs.portionCost, config.currency)}</strong></li>
                <li><span>Mano de Obra:</span> <strong>{formatCurrency(costs.laborCost, config.currency)}</strong></li>
                <li><span>Costes Indirectos:</span> <strong>{formatCurrency(costs.indirectCost, config.currency)}</strong></li>
                <li className="summary-total"><span>Coste Total Producción:</span> <strong>{formatCurrency(costs.totalProductionCost, config.currency)}</strong></li>
              </ul>
            </div>
            <div className="summary-col">
              <h3>Márgenes y Rentabilidad</h3>
              <ul>
                <li><span>PVP Sugerido (Sin IVA):</span> <strong>{formatCurrency(costs.priceWithoutVat, config.currency)}</strong></li>
                <li><span>PVP Sugerido (Con IVA {config.iva}%):</span> <strong>{formatCurrency(costs.priceWithVat, config.currency)}</strong></li>
                <li><span>Margen Bruto:</span> <strong>{formatCurrency(costs.grossMarginEuros, config.currency)} ({formatPercentage(costs.grossMarginPercent)})</strong></li>
                <li className="summary-total"><span>Food Cost:</span> <strong className={costs.foodCostPercentage > 35 ? 'danger' : 'success'}>{formatPercentage(costs.foodCostPercentage)}</strong></li>
              </ul>
            </div>
          </div>
          <div className="summary-formulas">
            <h3>Fórmulas Aplicadas (Configuración Global)</h3>
            <ul>
              <li><span>Coste Real (con merma):</span> <code>{config.formulas?.realCost || 'Precio Base / (1 - Merma / 100)'}</code></li>
              <li><span>Coste Ración:</span> <code>{config.formulas?.portionCost || 'Suma(Costes Ingredientes) / Raciones'}</code></li>
              <li><span>PVP Sugerido:</span> <code>{config.formulas?.suggestedPrice || 'Coste Total / (Food Cost % / 100)'}</code></li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};

export default RecipeDetail;
