import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  PlusCircle,
  ChevronRight,
  History
} from 'lucide-react';
import { calculateRecipeCosts, formatCurrency, formatPercentage } from '../utils/calculations';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { recipes, ingredients } = useStore();
  const navigate = useNavigate();

  const totalRecipes = recipes.length;
  const highFoodCost = recipes.filter(r => {
    const costs = calculateRecipeCosts(r, ingredients, recipes);
    return costs.foodCostPercentage > (r.targetFoodCost || 35);
  }).length;

  const recentRecipes = [...recipes]
    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
    .slice(0, 5);

  const stats = [
    { label: 'Total Escandallos', value: totalRecipes, icon: <CheckCircle2 />, color: 'success', path: '/recipes' },
    { label: 'Food Cost Crítico', value: highFoodCost, icon: <AlertTriangle />, color: 'danger', path: '/recipes?filter=critical' },
    { label: 'Semielaborados', value: recipes.filter(r => r.type === 'semielaborado').length, icon: <TrendingUp />, color: 'accent', path: '/semi-elaborated' },
    { label: 'Total Ingredientes', value: ingredients.length, icon: <PlusCircle />, color: 'warning', path: '/ingredients' },
  ];

  return (
    <div className="dashboard-view fade-in">
      <header className="view-header">
        <h1>Dashboard General</h1>
        <p>Resumen de operaciones y rentabilidad</p>
      </header>

      <div className="stats-grid">
        {stats.map((stat, idx) => (
          <div key={idx} className={`card stat-card ${stat.color}`} onClick={() => navigate(stat.path)}>
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-content">
              <span className="stat-label">{stat.label}</span>
              <h2 className="stat-value">{stat.value}</h2>
            </div>
            <ChevronRight className="stat-arrow" size={20} />
          </div>
        ))}
      </div>

      <div className="dashboard-content-grid">
        <section className="card recent-section">
          <div className="section-header">
            <h2><Clock size={20} /> Escandallos Recientes</h2>
            <button onClick={() => navigate('/recipes')} className="btn-text">Ver todos</button>
          </div>
          <div className="recent-list">
            {recentRecipes.map(r => {
              const costs = calculateRecipeCosts(r, ingredients, recipes);
              return (
                <div key={r.id} className="recent-item" onClick={() => navigate(`/recipes/${r.id}`)}>
                  <img src={r.image} alt={r.name} />
                  <div className="recent-info">
                    <h3>{r.name}</h3>
                    <p>{r.category}</p>
                  </div>
                  <div className="recent-meta">
                    <span className="recent-price">{formatCurrency(costs.portionCost)}/ud</span>
                    <span className={`recent-badge ${costs.foodCostPercentage > 35 ? 'danger' : 'success'}`}>
                      {formatPercentage(costs.foodCostPercentage)} FC
                    </span>
                  </div>
                  <ChevronRight size={16} className="item-arrow" />
                </div>
              );
            })}
          </div>
        </section>

        <section className="card history-section" onClick={() => navigate('/history')}>
          <div className="section-header">
            <h2><History size={20} /> Historial de Producción</h2>
          </div>
          <div className="history-placeholder">
            <div className="history-chart-mock">
              {/* Representación visual de un histórico */}
              {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                <div key={i} className="chart-bar" style={{ height: `${h}%` }}></div>
              ))}
            </div>
            <p>Toca para ver el historial de precios y elaboraciones de todos tus platos.</p>
            <button className="btn-secondary">Abrir Historial Completo</button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
