import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useStore } from './store/useStore';
import Sidebar from './components/Sidebar';
import Home from './views/Home';
import Dashboard from './views/Dashboard';
import RecipeList from './views/RecipeList';
import RecipeDetail from './views/RecipeDetail';
import RecipeEditor from './views/RecipeEditor';
import IngredientList from './views/IngredientList';
import Analytics from './views/Analytics';
import Settings from './views/Settings';
import HistoryView from './views/HistoryView';
import './styles/global.css';

const App: React.FC = () => {
  const fetchData = useStore(state => state.fetchData);
  const isLoading = useStore(state => state.isLoading);
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    fetchData();
    // In mobile, sidebar starts closed
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Cargando Escandallo KB...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className={`app-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <Sidebar isOpen={isSidebarOpen} onToggle={() => setSidebarOpen(!isSidebarOpen)} />
        
        <main className="main-content">
          <header className="top-bar">
            <button className="external-menu-toggle-btn" onClick={() => setSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <span className="top-bar-title">Escandallo KB</span>
          </header>

          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/recipes" element={<RecipeList type="plato" />} />
            <Route path="/semi-elaborated" element={<RecipeList type="semielaborado" />} />
            <Route path="/recipes/:id" element={<RecipeDetail />} />
            <Route path="/recipes/new" element={<RecipeEditor />} />
            <Route path="/recipes/edit/:id" element={<RecipeEditor />} />
            <Route path="/ingredients" element={<IngredientList />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/history" element={<HistoryView />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
