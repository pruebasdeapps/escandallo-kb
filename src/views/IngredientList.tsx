import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { formatCurrency, formatPercentage } from '../utils/calculations';
import type { Ingredient, Unit, PurchaseType } from '../types';
import { Search, Filter, Plus, Trash2, X, ShoppingCart, Truck, Edit2, ArrowLeft, Calculator } from 'lucide-react';
import DecimalInput from '../components/DecimalInput';
import './IngredientList.css';

const IngredientList: React.FC = () => {
  const navigate = useNavigate();
  const { ingredients, families, categories, addIngredient, updateIngredient, deleteIngredient } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('Todas');
  const [purchaseFilter, setPurchaseFilter] = useState('Todos');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showWasteCalc, setShowWasteCalc] = useState(false);
  const [wasteCalc, setWasteCalc] = useState({ gross: 0, net: 0 });
  const [newIng, setNewIng] = useState<Partial<Ingredient>>({
    name: '',
    category: categories[0] || 'Otros',
    family: families[0] || 'Despensa',
    unit: 'kg',
    price: 0,
    provider: '',
    waste: 0,
    allergens: [],
    purchaseType: 'Mayor',
    priceHistory: []
  });

  const filtered = ingredients.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFamily = selectedFamily === 'Todas' || i.family === selectedFamily;
    const matchesPurchase = purchaseFilter === 'Todos' || i.purchaseType === purchaseFilter;
    return matchesSearch && matchesFamily && matchesPurchase;
  });

  const handleOpenEdit = (ing: Ingredient) => {
    setNewIng(ing);
    setEditingId(ing.id);
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setNewIng({
      name: '',
      category: categories[0] || 'Otros',
      family: families[0] || 'Despensa',
      unit: 'kg',
      price: 0,
      provider: '',
      waste: 0,
      allergens: [],
      purchaseType: 'Mayor',
      priceHistory: []
    });
    setIsModalOpen(true);
  };

  const handleSaveIngredient = () => {
    if (!newIng.name || newIng.price === undefined) {
      alert('Nombre y precio son obligatorios.');
      return;
    }
    
    if (editingId) {
      updateIngredient(newIng as Ingredient);
    } else {
      const ingredientToSave: Ingredient = {
        ...(newIng as Ingredient),
        id: `ing-${Date.now()}`,
        lastUpdated: new Date().toISOString().split('T')[0],
        priceHistory: [] 
      };
      addIngredient(ingredientToSave);
    }
    
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar ${name}?`)) {
      deleteIngredient(id);
    }
  };

  return (
    <div className="ingredient-list-view fade-in">
      <header className="view-header">
        <div className="back-btn-container">
          <button className="btn-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> Volver
          </button>
        </div>
        <div className="header-text">
          <h1>Maestro de Ingredientes</h1>
          <p>Gestiona tus materias primas y canales de compra</p>
        </div>
        <button className="btn-primary btn-sm" onClick={handleOpenCreate}>
          <Plus size={16} /> Nuevo Ingrediente
        </button>
      </header>

      <div className="filters-bar-compact">
        <div className="search-box-modern">
          <Search size={16} />
          <input 
            type="text" 
            placeholder="Buscar ingrediente..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filters-group-row">
          <div className="select-modern">
            <Filter size={14} />
            <select value={selectedFamily} onChange={(e) => setSelectedFamily(e.target.value)}>
              <option value="Todas">Todas las Familias</option>
              {families.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          
          <div className="select-modern">
            <ShoppingCart size={14} />
            <select value={purchaseFilter} onChange={(e) => setPurchaseFilter(e.target.value)}>
              <option value="Todos">Compra (Todos)</option>
              <option value="Mayor">Al por Mayor</option>
              <option value="Menor (Supermercado)">Supermercado</option>
            </select>
          </div>
        </div>
      </div>

      <div className="table-wrapper-modern card">
        <table className="modern-table">
          <thead>
            <tr>
              <th>Ingrediente</th>
              <th>Compra</th>
              <th>Precio Base</th>
              <th>Merma / Rend.</th>
              <th>Precio Real</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map(ing => {
                const realPrice = ing.price / (1 - ing.waste / 100);
                const yieldPercent = 100 - ing.waste;
                return (
                   <tr key={ing.id}>
                    <td>
                      <div className="ing-name-cell">
                        <span className="ing-name">{ing.name}</span>
                        <span className="ing-cat">{ing.category}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`purchase-badge ${ing.purchaseType === 'Mayor' ? 'wholesale' : 'retail'}`}>
                        {ing.purchaseType === 'Mayor' ? <Truck size={12} /> : <ShoppingCart size={12} />}
                        {ing.purchaseType === 'Mayor' ? 'Mayor' : (ing.supermarket || 'Menor')}
                      </span>
                    </td>
                    <td>{formatCurrency(ing.price)} / {ing.unit}</td>
                    <td>
                      <div className="waste-yield-col">
                        <span className="waste-text">{formatPercentage(ing.waste)} M.</span>
                        <span className="yield-text">{formatPercentage(yieldPercent)} R.</span>
                      </div>
                    </td>
                    <td className="text-accent font-bold">{formatCurrency(realPrice)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn-icon-sm" onClick={() => handleOpenEdit(ing)}><Edit2 size={14} /></button>
                        <button className="btn-icon-sm danger" onClick={() => handleDelete(ing.id, ing.name)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No se encontraron ingredientes con los filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay fade-in">
          <div className="modal-content card">
            <div className="modal-header">
              <h2>{editingId ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}</h2>
              <button className="btn-icon-sm" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nombre</label>
                <input 
                  type="text" 
                  value={newIng.name} 
                  onChange={e => setNewIng({...newIng, name: e.target.value})} 
                  placeholder="Ej. Tomate Pera"
                />
              </div>
              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Precio Base</label>
                  <DecimalInput 
                    value={newIng.price || 0} 
                    onChangeValue={val => setNewIng({...newIng, price: val})} 
                  />
                </div>
                <div className="form-group flex-1">
                  <label>Unidad</label>
                  <select value={newIng.unit} onChange={e => setNewIng({...newIng, unit: e.target.value as Unit})}>
                    <option value="kg">kg</option>
                    <option value="L">L</option>
                    <option value="ud">ud</option>
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group flex-1">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ margin: 0 }}>Merma (%)</label>
                    <button className="btn-icon-sm" onClick={() => setShowWasteCalc(!showWasteCalc)} title="Calculadora de Merma"><Calculator size={14} /></button>
                  </div>
                  {showWasteCalc ? (
                    <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <div style={{ flex: 1 }}><label style={{ fontSize: '0.75rem' }}>Peso Bruto</label><DecimalInput value={wasteCalc.gross || ''} onChangeValue={val => setWasteCalc(prev => ({ ...prev, gross: val }))} /></div>
                        <div style={{ flex: 1 }}><label style={{ fontSize: '0.75rem' }}>Peso Neto</label><DecimalInput value={wasteCalc.net || ''} onChangeValue={val => setWasteCalc(prev => ({ ...prev, net: val }))} /></div>
                      </div>
                      <button className="btn-secondary btn-sm" onClick={() => {
                        if (wasteCalc.gross > 0 && wasteCalc.net >= 0 && wasteCalc.gross >= wasteCalc.net) {
                          const w = ((wasteCalc.gross - wasteCalc.net) / wasteCalc.gross) * 100;
                          setNewIng({ ...newIng, waste: parseFloat(w.toFixed(2)) });
                          setShowWasteCalc(false);
                        } else {
                          alert('Valores de peso inválidos.');
                        }
                      }}>Aplicar Merma</button>
                    </div>
                  ) : (
                    <DecimalInput 
                      value={newIng.waste || 0} 
                      onChangeValue={val => setNewIng({...newIng, waste: val})} 
                    />
                  )}
                </div>
                <div className="form-group flex-1">
                  <label>Tipo Compra</label>
                  <select value={newIng.purchaseType} onChange={e => setNewIng({...newIng, purchaseType: e.target.value as PurchaseType})}>
                    <option value="Mayor">Al por Mayor</option>
                    <option value="Menor (Supermercado)">Supermercado</option>
                  </select>
                </div>
              </div>
              {newIng.purchaseType === 'Menor (Supermercado)' && (
                <div className="form-group">
                  <label>Supermercado</label>
                  <div className="form-row">
                    <select 
                      className="flex-1"
                      value={newIng.supermarket || ''} 
                      onChange={e => {
                        if (e.target.value === 'ADD_NEW') {
                          const name = prompt('Nombre del nuevo supermercado:');
                          if (name) setNewIng({...newIng, supermarket: name});
                        } else {
                          setNewIng({...newIng, supermarket: e.target.value});
                        }
                      }}
                    >
                      <option value="">Seleccionar Supermercado...</option>
                      <option value="Mercadona">Mercadona</option>
                      <option value="Día">Día</option>
                      <option value="Aldi">Aldi</option>
                      <option value="Covirán">Covirán</option>
                      <option value="ADD_NEW">+ Añadir nuevo...</option>
                      {newIng.supermarket && !['Mercadona', 'Día', 'Aldi', 'Covirán'].includes(newIng.supermarket) && (
                        <option value={newIng.supermarket}>{newIng.supermarket}</option>
                      )}
                    </select>
                  </div>
                </div>
              )}
              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Familia</label>
                  <select value={newIng.family} onChange={e => setNewIng({...newIng, family: e.target.value})}>
                    {families.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="form-group flex-1">
                  <label>Categoría</label>
                  <select value={newIng.category} onChange={e => setNewIng({...newIng, category: e.target.value})}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSaveIngredient}>Guardar Ingrediente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IngredientList;

