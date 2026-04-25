import type { CashEntry, Ingredient, Recipe, RecipeItem } from './types'

export const RESERVA_FIXA = 2

export const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(value) ? value : 0)

export const toNumber = (value: string) => {
  const normalized = value.replace(',', '.').trim()
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export const calcUnitCost = (purchaseCost: number, purchaseQuantity: number) => {
  if (purchaseQuantity <= 0) return 0
  return purchaseCost / purchaseQuantity
}

export const calcRecipeTotal = (items: RecipeItem[], ingredients: Ingredient[]) =>
  items.reduce((sum, item) => {
    const ingredient = ingredients.find((candidate) => candidate.id === item.ingredientId)
    if (!ingredient) return sum
    return sum + ingredient.unitCost * item.quantityUsed
  }, 0)

export const calcFinancialSummary = (entries: CashEntry[]) => {
  const entrada = entries
    .filter((entry) => entry.type === 'entrada')
    .reduce((sum, entry) => sum + entry.value, 0)
  const saida = entries
    .filter((entry) => entry.type === 'saida' || entry.type === 'sangria')
    .reduce((sum, entry) => sum + entry.value, 0)
  const saldoDisponivel = entrada - saida
  const totalGuardar = entries
    .filter((entry) => entry.type === 'entrada')
    .reduce((sum, entry) => sum + Math.min(RESERVA_FIXA, entry.value), 0)
  const lucroLiquido = saldoDisponivel - totalGuardar

  return {
    entrada,
    saida,
    saldoDisponivel,
    totalGuardar,
    lucroLiquido,
  }
}

export const calcRecipeProjection = (recipe: Recipe) => {
  const salePricePerUnit = recipe.salePricePerUnit ?? 0
  const units = recipe.yieldCount && recipe.yieldCount > 0 ? recipe.yieldCount : 1
  const receitaPrevista = salePricePerUnit * units
  const valorGuardar = recipe.totalCost + RESERVA_FIXA
  const lucroPrevisto = receitaPrevista - RESERVA_FIXA

  return {
    receitaPrevista,
    valorGuardar,
    lucroPrevisto,
  }
}

export const calcSalesByRecipeSummary = (entries: CashEntry[], recipes: Recipe[]) => {
  const salesEntries = entries.filter((entry) => entry.type === 'entrada' && entry.recipeTag?.trim())
  const receitaRealizada = salesEntries.reduce((sum, entry) => sum + entry.value, 0)
  const descontoOperacional = salesEntries.length * RESERVA_FIXA
  const lucroRealizado = receitaRealizada - descontoOperacional
  const totalGuardar = salesEntries.reduce((sum, entry) => {
    const recipe = recipes.find((item) => item.name.toLowerCase() === entry.recipeTag?.trim().toLowerCase())
    const recipeCost = recipe?.totalCost ?? 0
    return sum + recipeCost + RESERVA_FIXA
  }, 0)

  return {
    totalVendasMarcadas: salesEntries.length,
    receitaRealizada,
    descontoOperacional,
    lucroRealizado,
    totalGuardar,
  }
}
