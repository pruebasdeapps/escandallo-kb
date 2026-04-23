import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { formatCurrency, calculateRecipeCosts } from '../utils/calculations';
import { TrendingDown, TrendingUp, ChefHat, Package, ArrowLeft } from 'lucide-react';
import './HistoryView.css';

const HistoryView: React.FC = () => {
  const navigate = useNavigate();
  const { recipes, ingredients } = useStore();
  const [activeTab, setActiveTab] = useState<'recipes' | 'ingredients'>('recipes');
  const [selectedIngId, setSelectedIngId] = useState<string | null>(null);

  const selectedIng = ingredients.find(i => i.id === selectedIngId);

  return (
    <div className="history-view fade-in">
      <header className="view-header">
        <div className="back-btn-container">
          <button className="btn-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> Volver
          </button>
        </div>
        <h1>Historial de Operaciones</h1>
        <p>Seguimiento de elaboraciones y evolución de precios</p>
      </header>

      <div className="history-tabs">
        <button 
          className={activeTab === 'recipes' ? 'active' : ''} 
          onClick={() => { setActiveTab('recipes'); setSelectedIngId(null); }}
        >
          <ChefHat size={18} /> Elaboraciones
        </button>
        <button 
          className={activeTab === 'ingredients' ? 'active' : ''} 
          onClick={() => setActiveTab('ingredients')}
        >
          <Package size={18} /> Precios Materia Prima
        </button>
      </div>

      <div className="history-content card">
        {activeTab === 'recipes' ? (
          <div className="history-table-wrapper">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Platillo / Semielab.</th>
                  <th>Total Prep.</th>
                  <th>Última Prep.</th>
                  <th>Coste Medio</th>
                  <th>Evolución</th>
                </tr>
              </thead>
              <tbody>
                {recipes.map(r => (
                  <tr key={r.id}>
                    <td className="font-bold">{r.name}</td>
                    <td>{r.totalPreps || 0}</td>
                    <td>{r.prepHistory?.[0]?.date || r.lastUpdated}</td>
                    <td>{formatCurrency(calculateRecipeCosts(r, ingredients, recipes).portionCost)}</td>
                    <td>
                      <div className="trend-badge stable">Estable</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="history-table-wrapper">
            {selectedIngId && selectedIng ? (
              <div className="detailed-history">
                <button className="btn-secondary btn-sm mb-1" onClick={() => setSelectedIngId(null)}>← Volver al listado</button>
                <h3>Evolución de Precio: {selectedIng.name}</h3>
                <table className="modern-table mt-1">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Precio Registrado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Hoy (Actual)</td>
                      <td className="font-bold">{formatCurrency(selectedIng.price)} / {selectedIng.unit}</td>
                    </tr>
                    {selectedIng.priceHistory?.map((h, idx) => (
                      <tr key={idx}>
                        <td>{h.date}</td>
                        <td>{formatCurrency(h.price)} / {selectedIng.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Ingrediente</th>
                    <th>Precio Actual</th>
                    <th>Último Cambio</th>
                    <th>Tendencia</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map(ing => (
                    <tr key={ing.id}>
                      <td className="font-bold">{ing.name}</td>
                      <td>{formatCurrency(ing.price)} / {ing.unit}</td>
                      <td>{ing.priceHistory?.[0]?.date || ing.lastUpdated}</td>
                      <td>
                        {ing.priceHistory && ing.priceHistory.length > 0 ? (
                          ing.price > ing.priceHistory[0].price ? (
                            <span className="trend-badge up"><TrendingUp size={12}/> Alza</span>
                          ) : ing.price < ing.priceHistory[0].price ? (
                            <span className="trend-badge down"><TrendingDown size={12}/> Baja</span>
                          ) : (
                            <span className="trend-badge stable">Sin cambios</span>
                          )
                        ) : (
                          <span className="trend-badge stable">Sin cambios</span>
                        )}
                      </td>
                      <td>
                        <button className="btn-icon-sm" onClick={() => setSelectedIngId(ing.id)} title="Ver detalles">
                          <TrendingUp size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryView;
