import { useMemo, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { useLocalStorageState } from './storage'
import type { CashEntry, CashEntryType, Ingredient, Recipe, RecipeItem, UnitType } from './types'
import {
  calcFinancialSummary,
  calcRecipeProjection,
  calcRecipeTotal,
  calcUnitCost,
  formatBRL,
  getRecipeAvailableCount,
  getRecipeProducedCount,
  getRecipeSoldCount,
  toNumber,
} from './utils'

const newId = () => crypto.randomUUID()

const unitOptions: UnitType[] = ['g', 'kg', 'ml', 'un']
const cashTypeOptions: CashEntryType[] = ['entrada', 'saida']

function App() {
  const [ingredients, setIngredients] = useLocalStorageState<Ingredient[]>('palhas.ingredients', [])
  const [recipes, setRecipes] = useLocalStorageState<Recipe[]>('palhas.recipes', [])
  const [cashEntries, setCashEntries] = useLocalStorageState<CashEntry[]>('palhas.cash', [])
  const [businessName] = useLocalStorageState<string>('palhas.businessName', 'Palhas da Luana')

  const financialSummary = useMemo(
    () => calcFinancialSummary(cashEntries, recipes),
    [cashEntries, recipes],
  )

  return (
    <div className="app-shell">
      <header className="header">
        <h1>{businessName}</h1>
        <p>Controle de custos, receitas e caixa</p>
      </header>

      <nav className="tabs">
        <NavLink to="/">Resumo</NavLink>
        <NavLink to="/ingredientes">Ingredientes</NavLink>
        <NavLink to="/receitas">Receitas</NavLink>
        <NavLink to="/financeiro">Financeiro</NavLink>
      </nav>

      <main className="content">
        <Routes>
          <Route
            path="/"
            element={<Dashboard financialSummary={financialSummary} recipes={recipes} />}
          />
          <Route
            path="/ingredientes"
            element={<IngredientsPage ingredients={ingredients} setIngredients={setIngredients} />}
          />
          <Route
            path="/receitas"
            element={
              <RecipesPage
                ingredients={ingredients}
                recipes={recipes}
                setRecipes={setRecipes}
              />
            }
          />
          <Route
            path="/financeiro"
            element={
              <FinancePage
                cashEntries={cashEntries}
                setCashEntries={setCashEntries}
                financialSummary={financialSummary}
                recipes={recipes}
                setRecipes={setRecipes}
              />
            }
          />
        </Routes>
      </main>
    </div>
  )
}

function Dashboard({
  financialSummary,
  recipes,
}: {
  financialSummary: ReturnType<typeof calcFinancialSummary>
  recipes: Recipe[]
}) {
  const latestRecipes = recipes.slice(-3).reverse()
  return (
    <section className="stack">
      <div className="card-group">
        <article className="card emphasis">
          <h2>Quanto tem</h2>
          <strong>{formatBRL(financialSummary.saldoDisponivel)}</strong>
        </article>
        <article className="card emphasis warning">
          <h2>Quanto deve guardar</h2>
          <strong>{formatBRL(financialSummary.totalGuardar)}</strong>
        </article>
        <article className="card emphasis success">
          <h2>Quanto teve de lucro</h2>
          <strong>{formatBRL(financialSummary.lucroLiquido)}</strong>
        </article>
      </div>
      <article className="card">
        <h2>Receitas recentes</h2>
        {latestRecipes.length === 0 ? (
          <p>Nenhuma receita cadastrada ainda.</p>
        ) : (
          <ul className="plain-list">
            {latestRecipes.map((recipe) => (
              <li key={recipe.id}>
                <span>{recipe.name}</span>
                <span>{formatBRL(recipe.totalCost)}</span>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  )
}

function IngredientsPage({
  ingredients,
  setIngredients,
}: {
  ingredients: Ingredient[]
  setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>
}) {
  const [name, setName] = useLocalStorageState<string>('palhas.draft.ingredients.name', '')
  const [unit, setUnit] = useLocalStorageState<UnitType>('palhas.draft.ingredients.unit', 'g')
  const [purchaseCost, setPurchaseCost] = useLocalStorageState<string>(
    'palhas.draft.ingredients.purchaseCost',
    '',
  )
  const [purchaseQuantity, setPurchaseQuantity] = useLocalStorageState<string>(
    'palhas.draft.ingredients.purchaseQuantity',
    '',
  )
  const [search, setSearch] = useLocalStorageState<string>('palhas.draft.ingredients.search', '')
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editUnit, setEditUnit] = useState<UnitType>('g')
  const [editPurchaseCost, setEditPurchaseCost] = useState('')
  const [editPurchaseQuantity, setEditPurchaseQuantity] = useState('')

  const filtered = ingredients.filter((ingredient) =>
    ingredient.name.toLowerCase().includes(search.toLowerCase()),
  )

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const cost = toNumber(purchaseCost)
    const quantity = toNumber(purchaseQuantity)
    if (!name.trim() || quantity <= 0 || cost <= 0) return
    const ingredient: Ingredient = {
      id: newId(),
      name: name.trim(),
      unit,
      purchaseCost: cost,
      purchaseQuantity: quantity,
      unitCost: calcUnitCost(cost, quantity),
      createdAt: new Date().toISOString(),
    }
    setIngredients((current) => [...current, ingredient])
    setName('')
    setPurchaseCost('')
    setPurchaseQuantity('')
  }

  const startEdit = (ingredient: Ingredient) => {
    setEditingIngredientId(ingredient.id)
    setEditName(ingredient.name)
    setEditUnit(ingredient.unit)
    setEditPurchaseCost(ingredient.purchaseCost.toString())
    setEditPurchaseQuantity(ingredient.purchaseQuantity.toString())
  }

  const saveEdit = (ingredientId: string) => {
    const cost = toNumber(editPurchaseCost)
    const quantity = toNumber(editPurchaseQuantity)
    if (!editName.trim() || quantity <= 0 || cost <= 0) return
    setIngredients((current) =>
      current.map((ingredient) =>
        ingredient.id === ingredientId
          ? {
              ...ingredient,
              name: editName.trim(),
              unit: editUnit,
              purchaseCost: cost,
              purchaseQuantity: quantity,
              unitCost: calcUnitCost(cost, quantity),
            }
          : ingredient,
      ),
    )
    setEditingIngredientId(null)
  }

  return (
    <section className="stack">
      <article className="card">
        <h2>Novo ingrediente</h2>
        <form className="form-grid" onSubmit={submit}>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome" />
          <select value={unit} onChange={(event) => setUnit(event.target.value as UnitType)}>
            {unitOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <input
            value={purchaseCost}
            onChange={(event) => setPurchaseCost(event.target.value)}
            placeholder="Custo da compra"
            inputMode="decimal"
          />
          <input
            value={purchaseQuantity}
            onChange={(event) => setPurchaseQuantity(event.target.value)}
            placeholder="Quantidade comprada"
            inputMode="decimal"
          />
          <button type="submit">Salvar ingrediente</button>
        </form>
      </article>

      <article className="card">
        <h2>Ingredientes cadastrados</h2>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar ingrediente"
        />
        <ul className="plain-list">
          {filtered.map((ingredient) => (
            <li key={ingredient.id}>
              {editingIngredientId === ingredient.id ? (
                <div className="edit-grid">
                  <input value={editName} onChange={(event) => setEditName(event.target.value)} />
                  <select value={editUnit} onChange={(event) => setEditUnit(event.target.value as UnitType)}>
                    {unitOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <input
                    value={editPurchaseCost}
                    onChange={(event) => setEditPurchaseCost(event.target.value)}
                    inputMode="decimal"
                    placeholder="Novo custo"
                  />
                  <input
                    value={editPurchaseQuantity}
                    onChange={(event) => setEditPurchaseQuantity(event.target.value)}
                    inputMode="decimal"
                    placeholder="Nova quantidade"
                  />
                  <div className="row-actions">
                    <button type="button" onClick={() => saveEdit(ingredient.id)}>
                      Salvar edição
                    </button>
                    <button type="button" onClick={() => setEditingIngredientId(null)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <strong>{ingredient.name}</strong>
                    <small>
                      {ingredient.purchaseQuantity} {ingredient.unit} por {formatBRL(ingredient.purchaseCost)}
                    </small>
                  </div>
                  <div className="row-actions">
                    <span>{formatBRL(ingredient.unitCost)}/{ingredient.unit}</span>
                    <button type="button" onClick={() => startEdit(ingredient)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() =>
                        setIngredients((current) => current.filter((item) => item.id !== ingredient.id))
                      }
                    >
                      Excluir
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
          {filtered.length === 0 && <li>Nenhum ingrediente encontrado.</li>}
        </ul>
      </article>
    </section>
  )
}

function RecipesPage({
  ingredients,
  recipes,
  setRecipes,
}: {
  ingredients: Ingredient[]
  recipes: Recipe[]
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>
}) {
  const [name, setName] = useLocalStorageState<string>('palhas.draft.recipes.name', '')
  const [yieldCount, setYieldCount] = useLocalStorageState<string>('palhas.draft.recipes.yieldCount', '')
  const [ingredientQuantities, setIngredientQuantities] = useLocalStorageState<Record<string, string>>(
    'palhas.draft.recipes.ingredientQuantities',
    {},
  )
  const [salePriceDrafts, setSalePriceDrafts] = useLocalStorageState<Record<string, string>>(
    'palhas.draft.recipes.salePriceDrafts',
    {},
  )

  const items: RecipeItem[] = ingredients
    .map((ingredient) => ({
      ingredientId: ingredient.id,
      quantityUsed: toNumber(ingredientQuantities[ingredient.id] ?? ''),
    }))
    .filter((item) => item.quantityUsed > 0)
  const currentTotal = calcRecipeTotal(items, ingredients)

  const saveRecipe = (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim() || items.length === 0) return
    const recipeYield = toNumber(yieldCount)
    const recipe: Recipe = {
      id: newId(),
      name: name.trim(),
      items,
      yieldCount: recipeYield > 0 ? recipeYield : undefined,
      producedCount: recipeYield > 0 ? recipeYield : 0,
      soldCount: 0,
      availableCount: recipeYield > 0 ? recipeYield : 0,
      totalCost: currentTotal,
      costPerUnit: recipeYield > 0 ? currentTotal / recipeYield : undefined,
      createdAt: new Date().toISOString(),
    }
    setRecipes((current) => [...current, recipe])
    setName('')
    setYieldCount('')
    setIngredientQuantities({})
  }

  const updateSalePriceDraft = (recipeId: string, rawValue: string) => {
    setSalePriceDrafts((current) => ({
      ...current,
      [recipeId]: rawValue,
    }))
  }

  const saveSalePrice = (recipeId: string) => {
    const rawValue = salePriceDrafts[recipeId] ?? ''
    const nextValue = rawValue.trim() === '' ? undefined : toNumber(rawValue)
    setRecipes((current) =>
      current.map((recipe) =>
        recipe.id === recipeId
          ? {
              ...recipe,
              salePricePerUnit: nextValue,
            }
          : recipe,
      ),
    )
    setSalePriceDrafts((current) => ({
      ...current,
      [recipeId]: nextValue?.toString() ?? '',
    }))
  }

  return (
    <section className="stack">
      <article className="card">
        <h2>Nova receita</h2>
        {ingredients.length === 0 && <p>Cadastre ingredientes antes de criar receitas.</p>}
        <form className="form-grid" onSubmit={saveRecipe}>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome da receita" />
          <input
            value={yieldCount}
            onChange={(event) => setYieldCount(event.target.value)}
            placeholder="Rendimento (opcional)"
            inputMode="decimal"
          />
          {ingredients.length > 0 && (
            <div className="ingredient-grid">
              {ingredients.map((ingredient) => (
                <label key={ingredient.id} className="ingredient-row">
                  <span>
                    {ingredient.name} ({ingredient.unit})
                  </span>
                  <input
                    value={ingredientQuantities[ingredient.id] ?? ''}
                    onChange={(event) =>
                      setIngredientQuantities((current) => ({
                        ...current,
                        [ingredient.id]: event.target.value,
                      }))
                    }
                    placeholder="Quantidade usada"
                    inputMode="decimal"
                  />
                </label>
              ))}
            </div>
          )}
          <div className="inline-total">
            <span>Total atual</span>
            <strong>{formatBRL(currentTotal)}</strong>
          </div>
          <button type="submit">Salvar receita</button>
        </form>

        <ul className="plain-list">
          {items.map((item, index) => {
            const ingredient = ingredients.find((value) => value.id === item.ingredientId)
            if (!ingredient) return null
            const itemTotal = ingredient.unitCost * item.quantityUsed
            return (
              <li key={`${item.ingredientId}-${index}`}>
                <span>
                  {ingredient.name} - {item.quantityUsed} {ingredient.unit}
                </span>
                <span>{formatBRL(itemTotal)}</span>
              </li>
            )
          })}
        </ul>
      </article>

      <article className="card">
        <h2>Receitas cadastradas</h2>
        <ul className="plain-list recipe-list">
          {recipes.map((recipe) => (
            <li key={recipe.id} className="recipe-card-item">
              <div className="recipe-main">
                <strong>{recipe.name}</strong>
                <small>
                  {recipe.yieldCount
                    ? `${recipe.yieldCount} un · ${formatBRL(recipe.costPerUnit ?? 0)}/un`
                    : 'Sem rendimento informado'}
                </small>
                <div className="recipe-stock-panel">
                  <div className="recipe-stock-grid">
                    <div>
                      <small>Feitas</small>
                      <strong>{getRecipeProducedCount(recipe)}</strong>
                    </div>
                    <div>
                      <small>Vendidas</small>
                      <strong>{getRecipeSoldCount(recipe)}</strong>
                    </div>
                    <div>
                      <small>Faltam</small>
                      <strong>{getRecipeAvailableCount(recipe)}</strong>
                    </div>
                  </div>
                  <div className="recipe-stock-track">
                    <div
                      className="recipe-stock-fill"
                      style={{
                        width: `${
                          getRecipeProducedCount(recipe) > 0
                            ? (getRecipeAvailableCount(recipe) / getRecipeProducedCount(recipe)) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
                <div className="projection-grid highlight-profit">
                  <div className="price-editor-row">
                    <input
                      value={salePriceDrafts[recipe.id] ?? recipe.salePricePerUnit?.toString() ?? ''}
                      onChange={(event) => updateSalePriceDraft(recipe.id, event.target.value)}
                      placeholder="Preço de venda por unidade (R$)"
                      inputMode="decimal"
                    />
                    <button type="button" onClick={() => saveSalePrice(recipe.id)}>
                      Salvar preco
                    </button>
                  </div>
                  {(() => {
                    const projection = calcRecipeProjection(recipe)
                    return (
                      <>
                        <strong className="profit-value">
                          Lucro previsto: {formatBRL(projection.lucroPrevisto)}
                        </strong>
                        <small>Receita prevista: {formatBRL(projection.receitaPrevista)}</small>
                        <small>Reserva para próxima produção: {formatBRL(projection.valorGuardar)}</small>
                        <small>
                          Cálculo do lucro: (preço de venda x rendimento) - 2.
                        </small>
                      </>
                    )
                  })()}
                </div>
              </div>
              <div className="row-actions">
                <span>Custo: {formatBRL(recipe.totalCost)}</span>
                <button
                  type="button"
                  className="danger"
                  onClick={() => setRecipes((current) => current.filter((item) => item.id !== recipe.id))}
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
          {recipes.length === 0 && <li>Nenhuma receita cadastrada.</li>}
        </ul>
      </article>
    </section>
  )
}

function FinancePage({
  cashEntries,
  setCashEntries,
  financialSummary,
  recipes,
  setRecipes,
}: {
  cashEntries: CashEntry[]
  setCashEntries: React.Dispatch<React.SetStateAction<CashEntry[]>>
  financialSummary: ReturnType<typeof calcFinancialSummary>
  recipes: Recipe[]
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>
}) {
  const [date, setDate] = useLocalStorageState<string>(
    'palhas.draft.finance.date',
    new Date().toISOString().slice(0, 10),
  )
  const [type, setType] = useLocalStorageState<CashEntryType>('palhas.draft.finance.type', 'entrada')
  const [soldTo, setSoldTo] = useLocalStorageState<string>('palhas.draft.finance.soldTo', '')
  const [description, setDescription] = useLocalStorageState<string>(
    'palhas.draft.finance.description',
    '',
  )
  const [value, setValue] = useLocalStorageState<string>('palhas.draft.finance.value', '')
  const [recipeTag, setRecipeTag] = useLocalStorageState<string>('palhas.draft.finance.recipeTag', '')
  const [soldQuantity, setSoldQuantity] = useLocalStorageState<string>('palhas.draft.finance.soldQuantity', '0')
  const [filterDate, setFilterDate] = useLocalStorageState<string>('palhas.draft.finance.filterDate', '')
  const [formError, setFormError] = useState('')
  const recipeTagSuggestions = useMemo(
    () => Array.from(new Set(recipes.map((recipe) => recipe.name))).sort((a, b) => a.localeCompare(b)),
    [recipes],
  )

  const filteredEntries = cashEntries.filter((entry) => {
    if (!filterDate) return true
    return entry.date === filterDate
  })

  const downloadCsv = () => {
    const entriesToExport = filteredEntries
    const header = [
      'Data',
      'Tipo',
      'Para quem vendeu',
      'Valor vendido',
      'Quantidade vendida',
      'Descricao',
      'Tag da receita',
    ]
    const lines = entriesToExport.map((entry) => [
      entry.date,
      entry.type,
      entry.soldTo ?? entry.category ?? '',
      entry.value.toFixed(2).replace('.', ','),
      String(entry.soldQuantity ?? 0),
      entry.description,
      entry.recipeTag ?? '',
    ])
    const csvRows = [header, ...lines].map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(';'),
    )
    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `fluxo-caixa-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const saveEntry = (event: React.FormEvent) => {
    event.preventDefault()
    const numericValue = toNumber(value)
    const quantity = toNumber(soldQuantity)
    const selectedRecipe = recipes.find(
      (recipe) => recipe.name.toLowerCase() === recipeTag.trim().toLowerCase(),
    )
    setFormError('')
    if (!date || !soldTo.trim() || numericValue <= 0) return
    if (type === 'entrada' && quantity < 0) {
      setFormError('Quantidade vendida nao pode ser negativa.')
      return
    }
    if (type === 'entrada' && recipeTag.trim() && !selectedRecipe) {
      setFormError('Receita nao encontrada para essa tag.')
      return
    }
    if (type === 'entrada' && selectedRecipe) {
      const available = getRecipeAvailableCount(selectedRecipe)
      if (quantity > available) {
        setFormError(`Quantidade vendida maior que o estoque disponivel (${available}).`)
        return
      }
    }

    const entry: CashEntry = {
      id: newId(),
      date,
      type,
      soldTo: soldTo.trim(),
      description: description.trim(),
      value: numericValue,
      recipeTag: recipeTag.trim() || undefined,
      soldQuantity: type === 'entrada' ? quantity : undefined,
    }
    setCashEntries((current) => [entry, ...current])
    if (type === 'entrada' && selectedRecipe) {
      setRecipes((current) =>
        current.map((recipe) => {
          if (recipe.id !== selectedRecipe.id) return recipe
          const previousSold = getRecipeSoldCount(recipe)
          const previousAvailable = getRecipeAvailableCount(recipe)
          return {
            ...recipe,
            soldCount: previousSold + quantity,
            availableCount: Math.max(previousAvailable - quantity, 0),
          }
        }),
      )
    }
    setSoldTo('')
    setDescription('')
    setValue('')
    setRecipeTag('')
    setSoldQuantity('0')
  }

  const removeEntry = (entryId: string) => {
    const entry = cashEntries.find((item) => item.id === entryId)
    if (!entry) return
    if (entry.type === 'entrada' && entry.recipeTag?.trim()) {
      const recipe = recipes.find(
        (item) => item.name.toLowerCase() === entry.recipeTag?.trim().toLowerCase(),
      )
      if (recipe) {
        const quantity = entry.soldQuantity ?? 0
        setRecipes((current) =>
          current.map((item) => {
            if (item.id !== recipe.id) return item
            const previousSold = getRecipeSoldCount(item)
            const previousAvailable = getRecipeAvailableCount(item)
            return {
              ...item,
              soldCount: Math.max(previousSold - quantity, 0),
              availableCount: Math.max(previousAvailable + quantity, 0),
            }
          }),
        )
      }
    }
    setCashEntries((current) => current.filter((item) => item.id !== entryId))
  }

  return (
    <section className="stack">
      <article className="card">
        <h2>Novo lançamento</h2>
        <form className="form-grid" onSubmit={saveEntry}>
          <input
            type="date"
            className="finance-date-input"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <select value={type} onChange={(event) => setType(event.target.value as CashEntryType)}>
            {cashTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <input
            value={soldTo}
            onChange={(event) => setSoldTo(event.target.value)}
            placeholder="Para quem vendeu"
          />
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Descrição"
          />
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Valor vendido"
            inputMode="decimal"
          />
          {type === 'entrada' && (
            <>
              <input
                value={recipeTag}
                onChange={(event) => setRecipeTag(event.target.value)}
                placeholder="Tag da receita (ex.: Palha Tradicional)"
                list="recipe-tag-suggestions"
              />
              <input
                value={soldQuantity}
                onChange={(event) => setSoldQuantity(event.target.value)}
                placeholder="Quantidade de palhas vendidas (pode ser 0)"
                inputMode="decimal"
              />
              <datalist id="recipe-tag-suggestions">
                {recipeTagSuggestions.map((suggestion) => (
                  <option key={suggestion} value={suggestion} />
                ))}
              </datalist>
            </>
          )}
          {formError && <small>{formError}</small>}
          <button type="submit">Salvar lançamento</button>
        </form>
      </article>

      <article className="card">
        <h2>Resumo financeiro</h2>
        <div className="card-group">
          <div>
            <small>Entradas</small>
            <p>{formatBRL(financialSummary.entrada)}</p>
          </div>
          <div>
            <small>Saídas</small>
            <p>{formatBRL(financialSummary.saida)}</p>
          </div>
          <div>
            <small>Lucro</small>
            <p>{formatBRL(financialSummary.lucroLiquido)}</p>
          </div>
        </div>
      </article>  

      <article className="card">
        <h2>Lançamentos</h2>
        <div className="row-actions-left">
          <input
            type="date"
            className="finance-date-input"
            value={filterDate}
            onChange={(event) => setFilterDate(event.target.value)}
          />
          <button type="button" onClick={downloadCsv}>
            Baixar planilha (.csv)
          </button>
        </div>
        <ul className="plain-list">
          {filteredEntries.map((entry) => (
            <li key={entry.id}>
              <div>
                <strong>
                  {entry.date} · {entry.type}
                </strong>
                <small>
                  {entry.soldTo ?? entry.category ?? ''}
                  {entry.description ? ` - ${entry.description}` : ''}
                  {entry.recipeTag ? ` · Receita: ${entry.recipeTag}` : ''}
                  {typeof entry.soldQuantity === 'number' ? ` · Qtd: ${entry.soldQuantity}` : ''}
                </small>
              </div>
              <div className="row-actions">
                <span>{formatBRL(entry.value)}</span>
                <button
                  type="button"
                  className="danger"
                  onClick={() => removeEntry(entry.id)}
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
          {filteredEntries.length === 0 && <li>Nenhum lançamento no filtro atual.</li>}
        </ul>
      </article>
    </section>
  )
}

export default App
