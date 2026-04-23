import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { calculateRecipeCosts } from '../utils/calculations';
import { TrendingUp, DollarSign, ArrowLeft } from 'lucide-react';
import './Analytics.css';

const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const { recipes, ingredients } = useStore();
  const plates = recipes.filter(r => r.type === 'plato');
  
  const recipeStats = plates.map(r => ({
    name: r.name,
    ...calculateRecipeCosts(r, ingredients, recipes)
  })).sort((a, b) => a.foodCostPercentage - b.foodCostPercentage);

  return (
    <div className="analytics-view fade-in">
      <header className="view-header">
        <div className="back-btn-container">
          <button className="btn-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> Volver
          </button>
        </div>
        <h1>Analítica de Rentabilidad</h1>
        <p>Visualización de márgenes y eficiencia de costes</p>
      </header>

      <div className="analytics-grid">
        <section className="analytics-card">
          <h2><TrendingUp size={20} /> Top 5 Platos más Rentables</h2>
          <div className="chart-placeholder">
            {recipeStats.slice(0, 5).map((stat, i) => (
              <div key={i} className="bar-row">
                <span className="bar-label">{stat.name}</span>
                <div className="bar-container">
                  <div className="bar-fill success" style={{ width: `${100 - stat.foodCostPercentage}%` }}></div>
                </div>
                <span className="bar-value">{100 - stat.foodCostPercentage}% Margen</span>
              </div>
            ))}
          </div>
        </section>

        <section className="analytics-card">
          <h2><DollarSign size={20} /> Distribución de Costes</h2>
          <div className="info-list">
            <div className="info-item">
              <span>Coste Medio por Ración</span>
              <strong>{recipeStats.length > 0 ? (recipeStats.reduce((acc, s) => acc + s.portionCost, 0) / recipeStats.length).toFixed(2) : 0} €</strong>
            </div>
            <div className="info-item">
              <span>Food Cost Medio General</span>
              <strong>{recipeStats.length > 0 ? (recipeStats.reduce((acc, s) => acc + s.foodCostPercentage, 0) / recipeStats.length).toFixed(1) : 0} %</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Analytics;
