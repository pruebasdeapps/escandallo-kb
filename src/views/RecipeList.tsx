import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { calculateRecipeCosts, formatCurrency } from '../utils/calculations';
import { Search, Filter, Plus, ChevronRight, ArrowLeft } from 'lucide-react';
import './RecipeList.css';

interface RecipeListProps {
  type: 'plato' | 'semielaborado';
}

const RecipeList: React.FC<RecipeListProps> = ({ type }) => {
  const { recipes, ingredients, categories } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  const filteredRecipes = recipes.filter(r => {
    const matchesType = r.type === type;
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || r.category === selectedCategory;
    return matchesType && matchesSearch && matchesCategory;
  });

  const navigate = useNavigate();

  return (
    <div className="recipe-list-view fade-in">
      <header className="view-header">
        <div className="back-btn-container">
          <button className="btn-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> Volver
          </button>
        </div>
        <div className="header-main">
          <div>
            <h1>{type === 'plato' ? 'Escandallos' : 'Semielaborados'}</h1>
            <p>Gestión de {type === 'plato' ? 'platos de carta' : 'bases y elaboraciones intermedias'}</p>
          </div>
          <Link to="/recipes/new" className="add-btn-primary">
            <Plus size={20} />
            Nuevo {type === 'plato' ? 'Plato' : 'Semielaborado'}
          </Link>
        </div>

        <div className="filters-bar">
          <div className="search-box">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <Filter size={18} />
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="Todas">Todas las categorías</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="recipe-grid">
        {filteredRecipes.length > 0 ? filteredRecipes.map(recipe => {
          const costs = calculateRecipeCosts(recipe, ingredients, recipes);
          return (
            <Link key={recipe.id} to={`/recipes/${recipe.id}`} className="recipe-card">
              <div className="recipe-image">
                <img src={recipe.image} alt={recipe.name} loading="lazy" />
                <span className="recipe-category-badge">{recipe.category}</span>
                {recipe.hasOutdatedPrice && (
                  <span className="outdated-price-badge" style={{ position: 'absolute', top: '10px', left: '10px', background: 'var(--danger)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>¡Costes Modificados!</span>
                )}
              </div>
              <div className="recipe-card-content">
                <h3>{recipe.name}</h3>
                <div className="recipe-meta">
                  <div className="meta-item">
                    <span>Coste/Ración</span>
                    <strong>{formatCurrency(costs.portionCost)}</strong>
                  </div>
                  <div className="meta-item">
                    <span>Food Cost</span>
                    <strong className={costs.foodCostPercentage > 35 ? 'danger' : 'success'}>
                      {costs.foodCostPercentage}%
                    </strong>
                  </div>
                </div>
                <div className="recipe-card-footer">
                  <span>{recipe.portions} {recipe.portionUnit}</span>
                  <ChevronRight size={16} />
                </div>
              </div>
            </Link>
          );
        }) : (
          <div className="empty-state">
            <p>No se encontraron recetas con estos filtros.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipeList;
