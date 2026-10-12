import { useEffect, useState } from 'react'
import { ArrowDownUp, Boxes, Check, ChevronDown, CircleAlert, CirclePlus, LayoutDashboard, LoaderCircle, Pencil, Search, SlidersHorizontal, Trash2, X } from 'lucide-react'
import './Stockroom.css'

const emptyProduct = { name: '', sku: '', category: 'Tires', quantity: '', price: '' }

async function request(path, options) {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } })
  const result = response.status === 204 ? null : await response.json()
  if (!response.ok) throw new Error(result?.error || 'Something went wrong.')
  return result
}

function ProductDialog({ product, onClose, onSave, saving }) {
  const [form, setForm] = useState(product || emptyProduct)
  const [formError, setFormError] = useState('')
  function update(field, value) { setForm((current) => ({ ...current, [field]: value })) }
  async function submit(event) {
    event.preventDefault()
    setFormError('')
    try { await onSave({ ...form, quantity: Number(form.quantity), price: Number(form.price) }) }
    catch (error) { setFormError(error.message) }
  }

  return (
    <div className="dialog-scrim" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="product-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div className="dialog-heading"><div><span className="eyebrow">INVENTORY ITEM</span><h2 id="dialog-title">{product ? 'Edit product' : 'Add a product'}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close dialog"><X size={19} /></button></div>
        <form onSubmit={submit} className="product-form">
          <label className="field field-wide">Product name<input autoFocus required maxLength="80" value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. Trailmark All-Season" /></label>
          <label className="field">SKU<input required maxLength="32" value={form.sku} onChange={(event) => update('sku', event.target.value)} placeholder="TM-205-55" /></label>
          <label className="field">Category<span className="select-wrap"><select value={form.category} onChange={(event) => update('category', event.target.value)}><option>Tires</option><option>Wheels</option><option>Accessories</option><option>Services</option></select><ChevronDown size={16} /></span></label>
          <label className="field">Quantity<input required type="number" min="0" step="1" value={form.quantity} onChange={(event) => update('quantity', event.target.value)} placeholder="0" /></label>
          <label className="field">Unit price<span className="currency-input"><span>$</span><input required type="number" min="0" step="0.01" value={form.price} onChange={(event) => update('price', event.target.value)} placeholder="0.00" /></span></label>
          {formError && <p className="form-error field-wide"><CircleAlert size={15} />{formError}</p>}
          <div className="dialog-actions field-wide"><button className="button button-quiet" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}{product ? 'Save changes' : 'Add product'}</button></div>
        </form>
      </section>
    </div>
  )
}

function App() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All items')
  const [stockFilter, setStockFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState('name')
  const [editing, setEditing] = useState(null)

  async function loadProducts() {
    try {
      const result = await request('/api/products')
      setProducts(result)
      setError('')
    }
    catch (loadError) { setError(loadError.message) }
    finally { setLoading(false) }
  }
  useEffect(() => {
    let active = true
    request('/api/products')
      .then((result) => {
        if (active) setProducts(result)
      })
      .catch((loadError) => {
        if (active) setError(loadError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const lowStockCount = products.filter((product) => product.quantity <= 8).length
  const inventoryValue = products.reduce((total, product) => total + product.price * product.quantity, 0)
  const visibleProducts = products
    .filter((product) => category === 'All items' || product.category === category)
    .filter((product) => stockFilter === 'all' || product.quantity <= 8)
    .filter((product) => `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(query.toLowerCase()))
    .sort((first, second) => sortOrder === 'quantity' ? first.quantity - second.quantity : first.name.localeCompare(second.name))

  async function saveProduct(values) {
    setSaving(true)
    try {
      if (editing?.id) await request(`/api/products/${editing.id}`, { method: 'PUT', body: JSON.stringify(values) })
      else await request('/api/products', { method: 'POST', body: JSON.stringify(values) })
      setEditing(null)
      await loadProducts()
    } finally { setSaving(false) }
  }
  async function deleteProduct(product) {
    if (!window.confirm(`Delete ${product.name}? This cannot be undone.`)) return
    try {
      await request(`/api/products/${product.id}`, { method: 'DELETE' })
      setProducts((current) => current.filter((item) => item.id !== product.id))
      setError('')
    } catch (deleteError) { setError(deleteError.message) }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#inventory" aria-label="Stockroom home"><span className="brand-mark"><Boxes size={21} strokeWidth={2.2} /></span><span>stockroom<span className="brand-period">.</span></span></a>
        <div className="workspace-label">WORKSPACE</div>
        <nav aria-label="Main navigation"><a className="nav-link nav-link-active" href="#inventory"><LayoutDashboard size={17} />Inventory</a></nav>
        <div className="sidebar-bottom"><div className="store-avatar">N</div><div className="store-copy"><strong>Northside Auto</strong><span>Store workspace</span></div><button className="icon-button sidebar-menu" aria-label="Workspace options" title="Workspace options"><SlidersHorizontal size={17} /></button></div>
      </aside>

      <main className="main-content" id="inventory">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>Inventory</strong></div><div className="api-status"><span className="status-dot" /> API connected</div></header>
        <div className="page-content">
          <section className="page-heading"><div><span className="eyebrow">MONDAY, OCTOBER 12</span><h1>Inventory</h1><p className="page-subtitle">A clear view of what’s on your shelves.</p></div><button className="button button-primary add-button" onClick={() => setEditing({ ...emptyProduct })}><CirclePlus size={17} /> Add product</button></section>
          <section className="metrics" aria-label="Inventory summary">
            <article className="metric metric-green"><span className="metric-label">TOTAL PRODUCTS</span><strong>{products.length.toString().padStart(2, '0')}</strong><span className="metric-note">Unique items listed</span><Boxes className="metric-icon" size={21} /></article>
            <article className="metric"><span className="metric-label">STOCK ON HAND</span><strong>{products.reduce((total, product) => total + product.quantity, 0).toLocaleString()}</strong><span className="metric-note">Across all products</span><ArrowDownUp className="metric-icon" size={20} /></article>
            <article className="metric"><span className="metric-label">INVENTORY VALUE</span><strong>{inventoryValue.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}</strong><span className="metric-note">At listed unit price</span><span className="value-mark">$</span></article>
            <article className={`metric ${lowStockCount ? 'metric-alert' : ''}`}><span className="metric-label">LOW STOCK</span><strong>{lowStockCount.toString().padStart(2, '0')}</strong><span className="metric-note">Items at 8 units or less</span><CircleAlert className="metric-icon" size={20} /></article>
          </section>

          <section className="inventory-panel" aria-label="Product inventory">
            <div className="table-heading"><div><h2>Products <span className="count-pill">{visibleProducts.length}</span></h2><p>Manage your catalog and stock levels</p></div><button className="sort-button" onClick={() => setSortOrder((current) => current === 'name' ? 'quantity' : 'name')} title={`Sort by ${sortOrder === 'name' ? 'quantity' : 'name'}`}><ArrowDownUp size={15} /><span>Sort</span></button></div>
            <div className="toolbar"><div className="filter-tabs" aria-label="Inventory filter"><button className={stockFilter === 'all' ? 'filter-tab active' : 'filter-tab'} onClick={() => setStockFilter('all')}>All items</button><button className={stockFilter === 'low' ? 'filter-tab active' : 'filter-tab'} onClick={() => setStockFilter('low')}>Low stock <span>{lowStockCount}</span></button></div><div className="toolbar-controls"><label className="category-select"><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category"><option>All items</option><option>Tires</option><option>Wheels</option><option>Accessories</option><option>Services</option></select><ChevronDown size={14} /></label><label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products..." aria-label="Search products" />{query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={14} /></button>}</label></div></div>
            {error && <div className="error-banner" role="alert"><CircleAlert size={16} /><span>{error}</span><button onClick={loadProducts}>Try again</button></div>}
            <div className="table-scroll"><table><thead><tr><th>PRODUCT</th><th>SKU</th><th>CATEGORY</th><th>IN STOCK</th><th>UNIT PRICE</th><th>STATUS</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
              {loading ? <tr><td colSpan="7" className="table-message"><LoaderCircle className="spin" size={19} /> Loading inventory</td></tr> : visibleProducts.length === 0 ? <tr><td colSpan="7" className="table-message">No products match your filters.</td></tr> : visibleProducts.map((product, index) => <tr key={product.id} style={{ animationDelay: `${index * 35}ms` }}><td><div className="product-name"><span className={`product-swatch swatch-${product.category.toLowerCase()}`}>{product.category === 'Tires' ? 'T' : product.category === 'Wheels' ? 'W' : product.category === 'Services' ? 'S' : 'A'}</span><strong>{product.name}</strong></div></td><td className="sku-cell">{product.sku}</td><td><span className="category-tag">{product.category}</span></td><td><span className="quantity-cell"><strong>{product.quantity}</strong><span>units</span></span></td><td className="price-cell">{product.price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td><td><span className={`stock-status ${product.quantity <= 8 ? 'stock-low' : 'stock-good'}`}><i />{product.quantity <= 8 ? 'Low stock' : 'In stock'}</span></td><td><div className="row-actions"><button className="icon-button" onClick={() => setEditing(product)} title={`Edit ${product.name}`} aria-label={`Edit ${product.name}`}><Pencil size={15} /></button><button className="icon-button delete-button" onClick={() => deleteProduct(product)} title={`Delete ${product.name}`} aria-label={`Delete ${product.name}`}><Trash2 size={15} /></button></div></td></tr>)}
            </tbody></table></div>
            <footer className="table-footer"><span>Showing <strong>{visibleProducts.length}</strong> of <strong>{products.length}</strong> products</span><span className="footer-live"><span className="status-dot" /> Changes save automatically</span></footer>
          </section>
          <p className="page-footnote">STOCKROOM <span>·</span> INVENTORY MANAGEMENT</p>
        </div>
      </main>
      {editing && <ProductDialog key={editing.id || 'new'} product={editing.id ? editing : null} saving={saving} onClose={() => setEditing(null)} onSave={saveProduct} />}
    </div>
  )
}

export default App
