import type { Ingredient, Recipe, RecipeIngredient, CostCalculation, AppConfig } from '../types';

// ── Coste de un ingrediente en una receta ──────────────────────────

export const calculateIngredientCost = (
  recipeIng: RecipeIngredient,
  allIngredients: Ingredient[],
  allRecipes: Recipe[]
): number => {
  const baseIng = allIngredients.find(i => i.id === recipeIng.id);
  if (baseIng) {
    // Coste real = precio / rendimiento (= 1 - merma/100)
    const totalWaste = baseIng.waste || 0;
    const effectivePrice = totalWaste < 100
      ? baseIng.price / (1 - totalWaste / 100)
      : baseIng.price;
    return effectivePrice * recipeIng.amount;
  }

  // Semielaborado (recursivo)
  const semiRecipe = allRecipes.find(r => r.id === recipeIng.id);
  if (semiRecipe) {
    const semiCost = calculateRecipeCosts(semiRecipe, allIngredients, allRecipes);
    return semiCost.portionCost * recipeIng.amount;
  }

  return 0;
};

// ── Cálculo de merma detallada ─────────────────────────────────────

export const calculateDetailedWaste = (ingredient: Ingredient): number => {
  if (ingredient.wasteByType) {
    const w = ingredient.wasteByType;
    // Merma acumulativa: cada fase se aplica sobre el remanente
    let remaining = 1;
    remaining *= (1 - (w.cleaning || 0) / 100);
    remaining *= (1 - (w.cooking || 0) / 100);
    remaining *= (1 - (w.cutting || 0) / 100);
    remaining *= (1 - (w.evaporation || 0) / 100);
    remaining *= (1 - (w.handling || 0) / 100);
    return (1 - remaining) * 100; // Merma total en %
  }
  return ingredient.waste || 0;
};

// ── Coste de mano de obra ──────────────────────────────────────────

export const calculateLaborCost = (recipe: Recipe): number => {
  if (!recipe.laborItems || recipe.laborItems.length === 0) return 0;
  return recipe.laborItems.reduce((total, item) => {
    return total + (item.minutes / 60) * item.costPerHour;
  }, 0);
};

// ── Coste de indirectos ────────────────────────────────────────────

export const calculateIndirectCost = (recipe: Recipe): number => {
  if (!recipe.indirectCosts || recipe.indirectCosts.length === 0) return 0;
  return recipe.indirectCosts.reduce((total, item) => total + item.amount, 0);
};

// ── Cálculo completo de una receta ─────────────────────────────────

export const calculateRecipeCosts = (
  recipe: Recipe,
  allIngredients: Ingredient[],
  allRecipes: Recipe[],
  config?: AppConfig
): CostCalculation => {
  // 1. Coste de materia prima
  let grossCost = 0;
  recipe.ingredients.forEach(ing => {
    grossCost += calculateIngredientCost(ing, allIngredients, allRecipes);
  });

  const mainIngredientsCost = grossCost;
  const complementsCost = 0; // Se podría separar si se marcan complementos

  // 2. Coste por ración
  const portionCost = recipe.portions > 0 ? grossCost / recipe.portions : 0;

  // 3. Mano de obra
  const laborCost = calculateLaborCost(recipe);
  const laborCostPerPortion = recipe.portions > 0 ? laborCost / recipe.portions : 0;

  // 4. Costes indirectos
  const indirectCost = calculateIndirectCost(recipe);

  // 5. Coste directo = materia prima + M.O.
  const directCostTotal = grossCost + laborCost;
  const directCostPerPortion = recipe.portions > 0 ? directCostTotal / recipe.portions : 0;

  // 6. Coste total de producción por ración
  const totalProductionCost = portionCost + laborCostPerPortion + indirectCost;

  // 7. Coste total por lote
  const costPerBatch = grossCost + laborCost + (indirectCost * recipe.portions);

  // 8. Precio sugerido basado en Food Cost objetivo
  const targetFC = recipe.targetFoodCost || 30;
  const suggestedPrice = targetFC > 0 ? totalProductionCost / (targetFC / 100) : 0;

  // 9. Precios con/sin IVA
  const iva = config?.iva || 10;
  const priceWithoutVat = suggestedPrice;
  const priceWithVat = suggestedPrice * (1 + iva / 100);

  // 10. Márgenes
  const grossMarginEuros = priceWithoutVat - totalProductionCost;
  const grossMarginPercent = priceWithoutVat > 0
    ? (grossMarginEuros / priceWithoutVat) * 100
    : 0;

  // 11. Food cost % real
  const foodCostPercentage = priceWithoutVat > 0
    ? (totalProductionCost / priceWithoutVat) * 100
    : targetFC;

  // 12. Beneficio por unidad
  const profitPerUnit = grossMarginEuros;

  // 13. Punto de equilibrio (requiere costes fijos mensuales, simplificamos)
  const breakEvenUnits = grossMarginEuros > 0
    ? Math.ceil((indirectCost * 30) / grossMarginEuros) // Estimación mensual
    : 0;

  return {
    netCost: grossCost,
    grossCost,
    portionCost,
    mainIngredientsCost,
    complementsCost,
    laborCost: laborCostPerPortion,
    indirectCost,
    totalCost: totalProductionCost,
    directCost: directCostPerPortion,
    totalProductionCost,
    costPerBatch,
    suggestedPrice,
    priceWithoutVat,
    priceWithVat,
    grossMarginEuros,
    grossMarginPercent,
    foodCostPercentage,
    profitPerUnit,
    breakEvenUnits
  };
};

// ── Utilidades de formato ──────────────────────────────────────────

export const formatDate = (isoString: string): string => {
  if (!isoString) return '';
  const dateObj = new Date(isoString);
  if (isNaN(dateObj.getTime())) return isoString;
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
};

export const formatCurrency = (amount: number, currency: string = '€') => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency === '€' ? 'EUR' : 'USD',
  }).format(amount);
};

export const formatPercentage = (value: number) => {
  return `${value.toFixed(1)}%`;
};

// ── Alérgenos ──────────────────────────────────────────────────────

export const getRecipeAllergens = (
  recipe: Recipe,
  allIngredients: Ingredient[],
  allRecipes: Recipe[]
): string[] => {
  const allergensSet = new Set<string>();

  recipe.ingredients.forEach(ri => {
    const baseIng = allIngredients.find(i => i.id === ri.id);
    if (baseIng) {
      baseIng.allergens.forEach(a => allergensSet.add(a));
    }

    const semiRecipe = allRecipes.find(r => r.id === ri.id);
    if (semiRecipe) {
      const semiAllergens = getRecipeAllergens(semiRecipe, allIngredients, allRecipes);
      semiAllergens.forEach(a => allergensSet.add(a));
    }
  });

  return Array.from(allergensSet);
};

// ── Punto de equilibrio avanzado ───────────────────────────────────

export const calculateBreakEven = (
  fixedCostMonthly: number,
  marginPerUnit: number
): number => {
  if (marginPerUnit <= 0) return Infinity;
  return Math.ceil(fixedCostMonthly / marginPerUnit);
};
