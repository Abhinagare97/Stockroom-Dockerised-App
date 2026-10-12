import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'

const app = express()
const port = Number(process.env.PORT) || 4000
const dataFile = join(dirname(fileURLToPath(import.meta.url)), 'data', 'products.json')
const clientDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')

app.use(express.json())

async function readProducts() {
  return JSON.parse(await readFile(dataFile, 'utf8'))
}

async function writeProducts(products) {
  await mkdir(dirname(dataFile), { recursive: true })
  await writeFile(dataFile, `${JSON.stringify(products, null, 2)}\n`, 'utf8')
}

function validateProduct(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const sku = typeof body.sku === 'string' ? body.sku.trim() : ''
  const category = typeof body.category === 'string' ? body.category.trim() : ''
  const quantity = Number(body.quantity)
  const price = Number(body.price)
  const allowedCategories = ['Tires', 'Wheels', 'Accessories', 'Services']
  if (!name || !sku || !allowedCategories.includes(category)) return { error: 'Name, SKU, and a valid category are required.' }
  if (!Number.isInteger(quantity) || quantity < 0 || !Number.isFinite(price) || price < 0) return { error: 'Quantity must be a non-negative whole number and price must be non-negative.' }
  return { product: { name, sku, category, quantity, price: Math.round(price * 100) / 100 } }
}

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }))

app.get('/api/products', async (_request, response, next) => {
  try { response.json(await readProducts()) } catch (error) { next(error) }
})

app.get('/api/products/:id', async (request, response, next) => {
  try {
    const products = await readProducts()
    const product = products.find((item) => item.id === request.params.id)
    if (!product) return response.status(404).json({ error: 'Product not found.' })
    response.json(product)
  } catch (error) { next(error) }
})

app.post('/api/products', async (request, response, next) => {
  const validation = validateProduct(request.body)
  if (validation.error) return response.status(400).json({ error: validation.error })
  try {
    const products = await readProducts()
    if (products.some((product) => product.sku.toLowerCase() === validation.product.sku.toLowerCase())) return response.status(409).json({ error: 'A product with that SKU already exists.' })
    const product = { id: randomUUID(), ...validation.product }
    products.push(product)
    await writeProducts(products)
    response.status(201).json(product)
  } catch (error) { next(error) }
})

app.put('/api/products/:id', async (request, response, next) => {
  const validation = validateProduct(request.body)
  if (validation.error) return response.status(400).json({ error: validation.error })
  try {
    const products = await readProducts()
    const index = products.findIndex((product) => product.id === request.params.id)
    if (index === -1) return response.status(404).json({ error: 'Product not found.' })
    if (products.some((product) => product.id !== request.params.id && product.sku.toLowerCase() === validation.product.sku.toLowerCase())) return response.status(409).json({ error: 'A product with that SKU already exists.' })
    products[index] = { id: request.params.id, ...validation.product }
    await writeProducts(products)
    response.json(products[index])
  } catch (error) { next(error) }
})

app.delete('/api/products/:id', async (request, response, next) => {
  try {
    const products = await readProducts()
    const remaining = products.filter((product) => product.id !== request.params.id)
    if (remaining.length === products.length) return response.status(404).json({ error: 'Product not found.' })
    await writeProducts(remaining)
    response.status(204).end()
  } catch (error) { next(error) }
})

app.use(express.static(clientDir))
app.use((request, response, next) => {
  if (request.method !== 'GET' || request.path === '/api' || request.path.startsWith('/api/')) return next()
  response.sendFile(join(clientDir, 'index.html'), (error) => {
    if (error) next(error)
  })
})

app.use((error, _request, response, _next) => {
  console.error(error)
  response.status(500).json({ error: 'The server could not complete the request.' })
})

await mkdir(dirname(dataFile), { recursive: true })
app.listen(port, () => console.log(`Inventory API listening on http://localhost:${port}`))