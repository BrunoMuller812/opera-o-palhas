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

  const financialSummary = useMemo(() => calcFinancialSummary(cashEntries), [cashEntries])

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
  const [name, setName] = useState('')
  const [unit, setUnit] = useState<UnitType>('g')
  const [purchaseCost, setPurchaseCost] = useState('')
  const [purchaseQuantity, setPurchaseQuantity] = useState('')
  const [search, setSearch] = useState('')
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
  const [name, setName] = useState('')
  const [yieldCount, setYieldCount] = useState('')
  const [ingredientQuantities, setIngredientQuantities] = useState<Record<string, string>>({})

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
      totalCost: currentTotal,
      costPerUnit: recipeYield > 0 ? currentTotal / recipeYield : undefined,
      createdAt: new Date().toISOString(),
    }
    setRecipes((current) => [...current, recipe])
    setName('')
    setYieldCount('')
    setIngredientQuantities({})
  }

  const updateSalePrice = (recipeId: string, rawValue: string) => {
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
        <ul className="plain-list">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <div>
                <strong>{recipe.name}</strong>
                <small>
                  {recipe.yieldCount
                    ? `${recipe.yieldCount} un · ${formatBRL(recipe.costPerUnit ?? 0)}/un`
                    : 'Sem rendimento informado'}
                </small>
                <div className="projection-grid highlight-profit">
                  <input
                    value={recipe.salePricePerUnit?.toString() ?? ''}
                    onChange={(event) => updateSalePrice(recipe.id, event.target.value)}
                    placeholder="Preço de venda por unidade (R$)"
                    inputMode="decimal"
                  />
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
}: {
  cashEntries: CashEntry[]
  setCashEntries: React.Dispatch<React.SetStateAction<CashEntry[]>>
  financialSummary: ReturnType<typeof calcFinancialSummary>
  recipes: Recipe[]
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [type, setType] = useState<CashEntryType>('entrada')
  const [soldTo, setSoldTo] = useState('')
  const [description, setDescription] = useState('')
  const [value, setValue] = useState('')
  const [recipeTag, setRecipeTag] = useState('')
  const [filterDate, setFilterDate] = useState('')
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
    const header = ['Data', 'Tipo', 'Para quem vendeu', 'Valor vendido', 'Descricao', 'Tag da receita']
    const lines = entriesToExport.map((entry) => [
      entry.date,
      entry.type,
      entry.soldTo ?? entry.category ?? '',
      entry.value.toFixed(2).replace('.', ','),
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
    if (!date || !soldTo.trim() || numericValue <= 0) return
    const entry: CashEntry = {
      id: newId(),
      date,
      type,
      soldTo: soldTo.trim(),
      description: description.trim(),
      value: numericValue,
      recipeTag: recipeTag.trim() || undefined,
    }
    setCashEntries((current) => [entry, ...current])
    setSoldTo('')
    setDescription('')
    setValue('')
    setRecipeTag('')
  }

  return (
    <section className="stack">
      <article className="card">
        <h2>Novo lançamento</h2>
        <form className="form-grid" onSubmit={saveEntry}>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
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
              <datalist id="recipe-tag-suggestions">
                {recipeTagSuggestions.map((suggestion) => (
                  <option key={suggestion} value={suggestion} />
                ))}
              </datalist>
            </>
          )}
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
          <input type="date" value={filterDate} onChange={(event) => setFilterDate(event.target.value)} />
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
                </small>
              </div>
              <div className="row-actions">
                <span>{formatBRL(entry.value)}</span>
                <button
                  type="button"
                  className="danger"
                  onClick={() =>
                    setCashEntries((current) => current.filter((item) => item.id !== entry.id))
                  }
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
