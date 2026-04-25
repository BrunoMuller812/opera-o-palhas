export type UnitType = 'g' | 'kg' | 'ml' | 'un'

export type CashEntryType = 'entrada' | 'saida' | 'sangria'

export interface Ingredient {
  id: string
  name: string
  unit: UnitType
  purchaseCost: number
  purchaseQuantity: number
  unitCost: number
  createdAt: string
}

export interface RecipeItem {
  ingredientId: string
  quantityUsed: number
}

export interface Recipe {
  id: string
  name: string
  items: RecipeItem[]
  yieldCount?: number
  totalCost: number
  costPerUnit?: number
  salePricePerUnit?: number
  createdAt: string
}

export interface CashEntry {
  id: string
  date: string
  type: CashEntryType
  soldTo?: string
  category?: string
  description: string
  value: number
  recipeTag?: string
}
