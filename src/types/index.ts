// ── Unidades y tipos base ──────────────────────────────────────────

export type Unit = 'kg' | 'g' | 'L' | 'ml' | 'ud' | 'ración' | 'unidad' | 'bandeja';
export type PrepStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type PurchaseType = 'Mayor' | 'Menor (Supermercado)';

export const EU_ALLERGENS = [
  'Gluten', 'Crustáceos', 'Huevos', 'Pescado', 'Cacahuetes', 'Soja', 
  'Lácteos', 'Frutos de cáscara', 'Apio', 'Mostaza', 'Sésamo', 
  'Sulfitos', 'Altramuces', 'Moluscos'
] as const;

export type EUAllergen = typeof EU_ALLERGENS[number];
export type ApprovalStatus = 'borrador' | 'pendiente' | 'aprobado' | 'rechazado';
export type SupplierRisk = 'bajo' | 'medio' | 'alto';

// ── Históricos ─────────────────────────────────────────────────────

export interface PriceHistory {
  date: string;
  price: number;
}

export interface PrepHistory {
  date: string;
  portions: number;
  costAtTime: number;
}

export interface RevisionEntry {
  date: string;
  author: string;
  reason: string;
  version: number;
}

// ── Elaboración ────────────────────────────────────────────────────

export interface ElaborationPhase {
  name: string;
  duration: number;       // minutos
  temperature?: string;   // "200 °C", "4 °C", etc.
  notes?: string;
}

// ── Mano de Obra ───────────────────────────────────────────────────

export interface LaborItem {
  profile: string;        // "Jefe de Cocina", "Ayudante", etc.
  minutes: number;
  costPerHour: number;
}

export interface LaborProfile {
  id: string;
  name: string;
  costPerHour: number;
}

// ── Costes Indirectos ──────────────────────────────────────────────

export interface IndirectCost {
  concept: string;        // "Energía", "Agua", "Envases", etc.
  amount: number;         // € por unidad de venta
}

export interface IndirectCostDefault {
  concept: string;
  defaultAmount: number;
}

// ── Merma detallada ────────────────────────────────────────────────

export interface WasteByType {
  cleaning: number;       // Merma por limpieza (%)
  cooking: number;        // Merma por cocción (%)
  cutting: number;        // Merma por despiece (%)
  evaporation: number;    // Merma por evaporación (%)
  handling: number;       // Pérdida por manipulación (%)
}

// ── Ingrediente ────────────────────────────────────────────────────

export interface Ingredient {
  id: string;
  name: string;
  category: string;
  family: string;
  unit: Unit;
  price: number;
  provider: string;
  waste: number;                    // Merma total (%)
  allergens: string[];
  purchaseType: PurchaseType;
  supermarket?: string;
  priceHistory: PriceHistory[];
  lastUpdated: string;

  // Bloque 3: Datos ampliados de ingrediente
  brand?: string;                   // Marca o especificación
  sku?: string;                     // Código interno / SKU
  purchaseUnit?: Unit;              // Unidad de compra (si difiere de uso)
  conversionFactor?: number;        // Factor de conversión compra → uso
  grossAmount?: number;             // Cantidad bruta estándar
  netAmount?: number;               // Cantidad neta tras merma

  // Bloque 4: Merma detallada
  wasteByType?: WasteByType;

  // Bloque 12: Datos operativos
  minStock?: number;                // Stock mínimo recomendado
  safetyStock?: number;             // Stock de seguridad
  shelfLife?: string;               // Caducidad / vida útil
  storageConditions?: string;       // Condiciones de conservación
  seasonality?: string;             // Estacionalidad
  substitutes?: string[];           // Sustituciones autorizadas
  supplierRisk?: SupplierRisk;      // Riesgo de suministro
}

// ── Ingrediente en una receta ──────────────────────────────────────

export interface RecipeIngredient {
  id: string;               // ID de Ingredient o Recipe (semielaborado)
  amount: number;            // Cantidad neta de uso
  unit: Unit;
  notes?: string;

  // Bloque 3: Cantidades brutas/netas por línea
  grossAmount?: number;      // Cantidad bruta
  yieldPercent?: number;     // Rendimiento (%)
}

// ── Receta / Escandallo ────────────────────────────────────────────

export type RecipeType = 'plato' | 'semielaborado';

export interface Recipe {
  id: string;
  name: string;
  type: RecipeType;
  category: string;
  image: string;
  portions: number;
  portionUnit: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  targetFoodCost: number;
  suggestedMargin: number;
  overheads?: number;
  prepHistory: PrepHistory[];
  totalPreps: number;
  lastUpdated: string;
  hasOutdatedPrice?: boolean;

  // Bloque 1: Identificación
  code?: string;                     // Código interno
  version?: number;                  // Versión del escandallo
  createdAt?: string;                // Fecha de creación
  revisedAt?: string;                // Fecha de última revisión
  saleUnit?: string;                 // Unidad de venta

  // Bloque 1+14: Aprobación formal
  approvalStatus?: ApprovalStatus;
  approvedBy?: string;               // Nombre del responsable
  approvedAt?: string;               // Fecha de aprobación
  approvalSignature?: string;        // Firma digital (nombre completo)

  // Bloque 2: Descripción técnica
  description?: string;
  qualityStandard?: string;
  presentation?: string;
  saleFormat?: string;
  grossWeight?: number;              // Peso bruto total (g)
  netWeight?: number;                // Peso neto final (g)

  // Bloque 5: Elaboración ampliada
  elaborationPhases?: ElaborationPhase[];
  totalTime?: number;                // Tiempo total (min)
  equipment?: string[];
  criticalPoints?: string[];
  platingNotes?: string;

  // Bloque 7: Mano de obra
  laborItems?: LaborItem[];

  // Bloque 8: Costes indirectos
  indirectCosts?: IndirectCost[];

  // Bloque 10: Precio de venta
  multiplier?: number;
  breakEvenUnits?: number;

  // Bloque 11: Indicadores de control
  theoreticalCost?: number;
  realCost?: number;
  costDeviation?: number;

  // Bloque 13: Calidad
  exactPortionWeight?: number;       // Peso exacto por ración (g)
  tolerancePercent?: number;
  servingTemp?: string;
  rejectionCriteria?: string;

  // Bloque 14: Documentación
  technicalSheetUrl?: string;
  labelingNotes?: string;
  conservationNotes?: string;
  revisionHistory?: RevisionEntry[];

  // Bloque 15: Observaciones
  operationalNotes?: string;
  frequentIssues?: string;
  revisionReason?: string;
  nextRevisionDate?: string;
}

// ── Configuración Global ───────────────────────────────────────────

export interface AppConfig {
  currency: string;
  defaultMargin: number;
  defaultOverheads: number;
  iva: number;
  formulas: {
    realCost: string;
    portionCost: string;
    suggestedPrice: string;
  };

  // Perfiles de mano de obra
  laborProfiles?: LaborProfile[];

  // Costes indirectos por defecto
  indirectCostDefaults?: IndirectCostDefault[];
}

// ── Datos de la aplicación ─────────────────────────────────────────

export interface AppData {
  ingredients: Ingredient[];
  recipes: Recipe[];
  categories: string[];
  families: string[];
  allergens: string[];
  config: AppConfig;
}

// ── Resultado de cálculos ──────────────────────────────────────────

export interface CostCalculation {
  // Costes de materia prima
  netCost: number;
  grossCost: number;
  portionCost: number;
  mainIngredientsCost: number;
  complementsCost: number;

  // Mano de obra
  laborCost: number;

  // Indirectos
  indirectCost: number;

  // Coste total
  totalCost: number;
  directCost: number;
  totalProductionCost: number;
  costPerBatch: number;

  // Precio de venta
  suggestedPrice: number;
  priceWithoutVat: number;
  priceWithVat: number;

  // Márgenes
  grossMarginEuros: number;
  grossMarginPercent: number;
  foodCostPercentage: number;

  // Control
  profitPerUnit: number;
  breakEvenUnits: number;
}
