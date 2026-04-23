import { create } from 'zustand';
import type { AppData, Ingredient, Recipe, AppConfig } from '../types';

export type Theme = 'light' | 'dark' | 'system';

const DEFAULT_CONFIG: AppConfig = {
  currency: '€',
  defaultMargin: 100,
  defaultOverheads: 15,
  iva: 20,
  formulas: {
    realCost: 'Precio Base / (1 - Merma / 100)',
    portionCost: 'Suma(Costes Ingredientes) / Raciones',
    suggestedPrice: 'Coste Total * (1 + (Margen % / 100))'
  },
  laborProfiles: [
    { id: 'lp-1', name: 'Jefe de Cocina', costPerHour: 18 },
    { id: 'lp-2', name: 'Cocinero', costPerHour: 13 },
    { id: 'lp-3', name: 'Ayudante de Cocina', costPerHour: 10 },
    { id: 'lp-4', name: 'Pastelero', costPerHour: 14 }
  ],
  indirectCostDefaults: [
    { concept: 'Energía (gas/electricidad)', defaultAmount: 0.35 },
    { concept: 'Agua', defaultAmount: 0.05 },
    { concept: 'Limpieza', defaultAmount: 0.10 },
    { concept: 'Envases y embalajes', defaultAmount: 0.20 },
    { concept: 'Amortización equipos', defaultAmount: 0.15 },
    { concept: 'Mantenimiento', defaultAmount: 0.08 }
  ]
};

interface AppState extends AppData {
  theme: Theme;
  isLoading: boolean;
  error: string | null;
  fetchData: () => Promise<void>;
  setTheme: (theme: Theme) => void;
  addIngredient: (ingredient: Ingredient) => void;
  updateIngredient: (ingredient: Ingredient) => void;
  deleteIngredient: (id: string) => void;
  addRecipe: (recipe: Recipe) => void;
  updateRecipe: (recipe: Recipe) => void;
  deleteRecipe: (id: string) => void;
  updateConfig: (config: AppConfig) => void;
}

/**
 * Deep merge de config para garantizar que campos nuevos siempre existan
 * aunque los datos en localStorage sean de una versión anterior.
 */
const deepMergeConfig = (defaults: AppConfig, saved: Partial<AppConfig> | undefined): AppConfig => {
  if (!saved) return { ...defaults };
  
  // Forzar nuevos valores por defecto si los guardados son los antiguos o no existen
  const iva = (saved.iva === undefined || saved.iva === 10) ? defaults.iva : saved.iva;
  const defaultMargin = (saved.defaultMargin === undefined || saved.defaultMargin === 70) ? defaults.defaultMargin : saved.defaultMargin;

  return {
    ...defaults,
    ...saved,
    iva,
    defaultMargin,
    formulas: {
      ...defaults.formulas,
      ...(saved.formulas || {})
    },
    laborProfiles: saved.laborProfiles && saved.laborProfiles.length > 0
      ? saved.laborProfiles
      : defaults.laborProfiles,
    indirectCostDefaults: saved.indirectCostDefaults && saved.indirectCostDefaults.length > 0
      ? saved.indirectCostDefaults
      : defaults.indirectCostDefaults
  };
};

export const useStore = create<AppState>((set, get) => ({
  ingredients: [],
  recipes: [],
  categories: [],
  families: [],
  allergens: [],
  config: { ...DEFAULT_CONFIG },
  theme: 'light',
  isLoading: false,
  error: null,

  setTheme: (theme) => {
    set({ theme });
    applyTheme(theme);
    localStorage.setItem('escandallo_theme', theme);
  },

  fetchData: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch('/lista.json');
      if (!response.ok) throw new Error('Error al cargar los datos');
      const data: AppData = await response.json();
      
      const localData = localStorage.getItem('escandallo_data');
      if (localData) {
        const parsed = JSON.parse(localData);
        
        // Fusión inteligente: añadir ingredientes/recetas nuevas de lista.json que no estén en local
        const newIngredients = data.ingredients.filter(di => !parsed.ingredients.some((pi: any) => pi.id === di.id));
        parsed.ingredients = [...parsed.ingredients, ...newIngredients];

        // Fusión de recetas: añadir nuevas y sobreescribir los 'mock-'
        let updatedRecipes = [...parsed.recipes];
        
        // 1. Añadir las nuevas
        const newRecipes = data.recipes.filter(dr => !updatedRecipes.some(pr => pr.id === dr.id));
        updatedRecipes = [...updatedRecipes, ...newRecipes];

        // 2. Sobreescribir las que empiezan por 'mock-' con las versiones del JSON (para los ejemplos hiper-detallados)
        updatedRecipes = updatedRecipes.map(pr => {
          if (pr.id.startsWith('mock-')) {
            const masterMock = data.recipes.find(dr => dr.id === pr.id);
            return masterMock || pr;
          }
          return pr;
        });
        
        parsed.recipes = updatedRecipes;

        const mergedConfig = deepMergeConfig(DEFAULT_CONFIG, parsed.config);
        
        const finalState = { ...parsed, config: mergedConfig, isLoading: false };
        set(finalState);
        localStorage.setItem('escandallo_data', JSON.stringify(finalState)); // Guardar la fusión
        applyTheme(parsed.theme || 'light');
      } else {
        const mergedConfig = deepMergeConfig(DEFAULT_CONFIG, data.config);
        const finalState = { ...data, config: mergedConfig, isLoading: false };
        set(finalState);
        localStorage.setItem('escandallo_data', JSON.stringify(finalState));
        applyTheme('light');
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  addIngredient: (ingredient) => {
    const newState = { ingredients: [...get().ingredients, ingredient] };
    set(newState);
    saveToLocal(get());
  },

  updateIngredient: (ingredient) => {
    const { ingredients, recipes } = get();
    const old = ingredients.find(i => i.id === ingredient.id);
    
    let updatedIng = { ...ingredient };
    let recipesUpdated = false;
    let newRecipes = [...recipes];

    if (old && old.price !== ingredient.price) {
      const d = new Date();
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      
      const historyEntry = { date: `${day}/${month}/${year}`, price: old.price };
      updatedIng.priceHistory = [historyEntry, ...(old.priceHistory || [])];

      // Mark affected recipes
      newRecipes = newRecipes.map(r => {
        const usesIngredient = r.ingredients.some(i => i.id === ingredient.id);
        if (usesIngredient) {
          recipesUpdated = true;
          return { ...r, hasOutdatedPrice: true };
        }
        return r;
      });
    }

    const newIngredients = ingredients.map(i => i.id === ingredient.id ? updatedIng : i);
    
    if (recipesUpdated) {
      set({ ingredients: newIngredients, recipes: newRecipes });
    } else {
      set({ ingredients: newIngredients });
    }
    
    saveToLocal(get());
  },

  deleteIngredient: (id) => {
    const newState = {
      ingredients: get().ingredients.filter(i => i.id !== id)
    };
    set(newState);
    saveToLocal(get());
  },

  addRecipe: (recipe) => {
    const newState = { recipes: [...get().recipes, recipe] };
    set(newState);
    saveToLocal(get());
  },

  updateRecipe: (recipe) => {
    const newState = {
      recipes: get().recipes.map(r => r.id === recipe.id ? recipe : r)
    };
    set(newState);
    saveToLocal(get());
  },

  deleteRecipe: (id) => {
    const newState = {
      recipes: get().recipes.filter(r => r.id !== id)
    };
    set(newState);
    saveToLocal(get());
  },

  updateConfig: (config) => {
    const newState = { config };
    set(newState);
    saveToLocal(get());
  }
}));

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  let activeTheme = theme;
  
  if (theme === 'system') {
    activeTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  root.setAttribute('data-theme', activeTheme);
};

const saveToLocal = (state: AppState) => {
  const dataToSave = {
    ingredients: state.ingredients,
    recipes: state.recipes,
    categories: state.categories,
    families: state.families,
    allergens: state.allergens,
    config: state.config,
    theme: state.theme
  };
  localStorage.setItem('escandallo_data', JSON.stringify(dataToSave));
};
