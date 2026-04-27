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

export const getRecipeProducedCount = (recipe: Recipe) =>
  recipe.producedCount ?? recipe.yieldCount ?? 0

export const getRecipeSoldCount = (recipe: Recipe) => recipe.soldCount ?? 0

export const getRecipeGiftedCount = (recipe: Recipe) => recipe.giftedCount ?? 0

export const getRecipeAvailableCount = (recipe: Recipe) => {
  if (typeof recipe.availableCount === 'number') return recipe.availableCount
  return Math.max(
    getRecipeProducedCount(recipe) - getRecipeSoldCount(recipe) - getRecipeGiftedCount(recipe),
    0,
  )
}

export const getRecipeUnitCost = (recipe: Recipe) => {
  if (typeof recipe.costPerUnit === 'number' && recipe.costPerUnit > 0) return recipe.costPerUnit
  const produced = getRecipeProducedCount(recipe)
  if (produced <= 0) return 0
  return recipe.totalCost / produced
}

export const calcFinancialSummary = (entries: CashEntry[], recipes: Recipe[]) => {
  const entrada = entries
    .filter((entry) => entry.type === 'entrada')
    .reduce((sum, entry) => sum + entry.value, 0)
  const saida = entries
    .filter((entry) => entry.type === 'saida' || entry.type === 'sangria')
    .reduce((sum, entry) => sum + entry.value, 0)
  const saldoDisponivel = entrada - saida

  const guardarPorReceita = entries.reduce<Record<string, number>>((acc, entry) => {
    const tag = entry.recipeTag?.trim().toLowerCase()
    if (!tag) return acc

    const recipe = recipes.find((item) => item.name.toLowerCase() === tag)
    const unitCost = recipe ? getRecipeUnitCost(recipe) : 0
    const quantity = entry.soldQuantity ?? 0
    const current = acc[tag] ?? 0

    if (entry.type === 'entrada') {
      acc[tag] = current + unitCost * quantity + RESERVA_FIXA
      return acc
    }

    if (entry.type === 'saida') {
      // Palha dada: custo sai direto para o valor a guardar.
      acc[tag] = current + unitCost * quantity
      return acc
    }

    return acc
  }, {})

  const totalGuardar = Object.entries(guardarPorReceita).reduce((sum, [tag, acumulado]) => {
    const recipe = recipes.find((item) => item.name.toLowerCase() === tag)
    if (!recipe) return sum + acumulado
    const limiteReceita = recipe.totalCost + RESERVA_FIXA
    return sum + Math.min(acumulado, limiteReceita)
  }, 0)

  const lucroLiquido = entries.reduce((sum, entry) => {
    if (entry.type !== 'entrada' || !entry.recipeTag?.trim()) return sum
    const quantity = entry.soldQuantity ?? 0
    const recipe = recipes.find(
      (item) => item.name.toLowerCase() === entry.recipeTag?.trim().toLowerCase(),
    )
    const unitCost = recipe ? getRecipeUnitCost(recipe) : 0
    const guardar = unitCost * quantity + RESERVA_FIXA
    return sum + (entry.value - guardar)
  }, 0)

  return {
    entrada,
    saida,
    saldoDisponivel,
    totalGuardar,
    lucroLiquido,
  }
}
