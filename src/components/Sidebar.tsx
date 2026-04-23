import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home,
  LayoutDashboard, 
  UtensilsCrossed,
  ChefHat, 
  Package, 
  BarChart3, 
  Settings,
  PlusCircle,
  Menu,
  Sun,
  Moon,
  Monitor,
  Database
} from 'lucide-react';
import { useStore } from '../store/useStore';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const { theme, setTheme } = useStore();
  const menuItems = [
    { icon: <Home size={20} />, label: 'Inicio', path: '/' },
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <UtensilsCrossed size={20} />, label: 'Escandallos', path: '/recipes' },
    { icon: <ChefHat size={20} />, label: 'Semielaborados', path: '/semi-elaborated' },
    { icon: <Package size={20} />, label: 'Ingredientes', path: '/ingredients' },
    { icon: <BarChart3 size={20} />, label: 'Analítica', path: '/analytics' },
    { icon: <Settings size={20} />, label: 'Configuración', path: '/settings' },
  ];
  
  const handleExport = () => {
    const data = localStorage.getItem('escandallo_data');
    if (!data) return alert('No hay datos para exportar.');
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `escandallo_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button className="menu-toggle-inline" onClick={onToggle}>
            <Menu size={24} />
          </button>
          <div className="logo-container">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="KB Logo" className="logo-img" />
          </div>
          <div className="brand-text">
            <h1>Escandallo <span>KB</span></h1>
            <p>By Khaoula Beyuki</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink 
              key={item.path} 
              to={item.path} 
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => window.innerWidth < 768 && onToggle()}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <NavLink to="/recipes/new" className="create-btn">
            <PlusCircle size={20} />
            <span>Nuevo Escandallo</span>
          </NavLink>

          <button className="nav-item backup-btn-sidebar" onClick={handleExport} title="Descargar Copia de Seguridad" style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <Database size={20} />
            <span>Copia de Seguridad</span>
          </button>
          
          <div className="theme-selector">
            <button 
              className={theme === 'light' ? 'active' : ''} 
              onClick={() => setTheme('light')}
              title="Modo Claro"
            >
              <Sun size={18} />
            </button>
            <button 
              className={theme === 'dark' ? 'active' : ''} 
              onClick={() => setTheme('dark')}
              title="Modo Oscuro"
            >
              <Moon size={18} />
            </button>
            <button 
              className={theme === 'system' ? 'active' : ''} 
              onClick={() => setTheme('system')}
              title="Sistema"
            >
              <Monitor size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
