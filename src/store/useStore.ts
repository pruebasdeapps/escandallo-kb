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
  getRecipesUsingItem: (id: string) => string[];
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

/**
 * Encuentra de forma recursiva (cascada profunda) todas las recetas
 * que dependen directa o indirectamente de un ingrediente o semielaborado.
 */
const getAffectedRecipeIds = (recipes: Recipe[], targetId: string): string[] => {
  const affected = new Set<string>();

  const findAffected = (id: string) => {
    recipes.forEach(r => {
      if (r.ingredients.some(i => i.id === id)) {
        if (!affected.has(r.id)) {
          affected.add(r.id);
          findAffected(r.id); // Llamada recursiva para los padres
        }
      }
    });
  };

  findAffected(targetId);
  return Array.from(affected);
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

    // 1. Cargar datos locales primero (fuente principal si existen)
    const localData = localStorage.getItem('escandallo_data');
    let localParsed: any = null;
    if (localData) {
      try {
        localParsed = JSON.parse(localData);
      } catch {
        localParsed = null;
      }
    }

    // 2. Intentar cargar lista.json como complemento (no bloqueante)
    let remoteData: AppData | null = null;
    try {
      const baseUrl = import.meta.env.BASE_URL;
      const response = await fetch(`${baseUrl}lista.json`);
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          remoteData = await response.json();
        }
      }
    } catch {
      // Fallo de red / SW / offline: no bloquear la carga
    }

    // 3. Fusionar y establecer estado
    if (localParsed && localParsed.ingredients) {
      // Hay datos locales: usarlos como base y fusionar con remoto si existe
      if (remoteData) {
        const newIngredients = remoteData.ingredients.filter(
          (di: Ingredient) => !localParsed.ingredients.some((pi: any) => pi.id === di.id)
        );
        localParsed.ingredients = [...localParsed.ingredients, ...newIngredients];

        let updatedRecipes = [...localParsed.recipes];
        const newRecipes = remoteData.recipes.filter(
          (dr: Recipe) => !updatedRecipes.some((pr: any) => pr.id === dr.id)
        );
        updatedRecipes = [...updatedRecipes, ...newRecipes];

        updatedRecipes = updatedRecipes.map((pr: any) => {
          if (pr.id.startsWith('mock-')) {
            const masterMock = remoteData!.recipes.find((dr: Recipe) => dr.id === pr.id);
            return masterMock || pr;
          }
          return pr;
        });
        localParsed.recipes = updatedRecipes;
      }

      const mergedConfig = deepMergeConfig(DEFAULT_CONFIG, localParsed.config);
      const finalState = { ...localParsed, config: mergedConfig, isLoading: false };
      set(finalState);
      localStorage.setItem('escandallo_data', JSON.stringify(finalState));
      applyTheme(localParsed.theme || 'light');
    } else if (remoteData) {
      // No hay datos locales: usar lista.json como fuente inicial
      const mergedConfig = deepMergeConfig(DEFAULT_CONFIG, remoteData.config);
      const finalState = { ...remoteData, config: mergedConfig, isLoading: false };
      set(finalState);
      localStorage.setItem('escandallo_data', JSON.stringify(finalState));
      applyTheme('light');
    } else {
      // Ni local ni remoto: mostrar error
      set({ error: 'No se pudieron cargar los datos. Verifica tu conexión.', isLoading: false });
    }
  },

  getRecipesUsingItem: (id: string) => {
    const { recipes } = get();
    return recipes
      .filter(r => r.ingredients.some(ing => ing.id === id))
      .map(r => r.name);
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

      // Cascada profunda: marcar todas las recetas dependientes (directas o indirectas)
      const affectedIds = getAffectedRecipeIds(recipes, ingredient.id);
      if (affectedIds.length > 0) {
        recipesUpdated = true;
        newRecipes = newRecipes.map(r => {
          if (affectedIds.includes(r.id)) {
            return { ...r, hasOutdatedPrice: false, lastUpdated: new Date().toISOString().split('T')[0] };
          }
          return r;
        });
      }
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
    const { recipes } = get();
    
    // Si se modifica un semielaborado, propagar fecha a los platos que lo usan
    const affectedIds = getAffectedRecipeIds(recipes, recipe.id);
    let newRecipes = recipes.map(r => r.id === recipe.id ? recipe : r);

    if (affectedIds.length > 0) {
      newRecipes = newRecipes.map(r => {
        if (affectedIds.includes(r.id)) {
          return { ...r, lastUpdated: new Date().toISOString().split('T')[0] };
        }
        return r;
      });
    }

    set({ recipes: newRecipes });
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
