const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');


const app = express();
const PORT = process.env.PORT || 8082;
const DATA_FILE = path.join(__dirname, 'products.json');


app.use(cors());
app.use(express.json());


function readProducts() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (error) {
    return [];
  }
}
function writeProducts(products) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2), 'utf8');
}
function nextId(products) {
  return products.length ? Math.max(...products.map(p => Number(p.id) || 0)) + 1 : 1;
}


app.get('/', (req, res) => res.json({ message: 'Fruit Shop API is running', endpoints: ['/api/products'] }));
app.get('/api/products', (req, res) => res.json(readProducts()));
app.get('/api/products/:id', (req, res) => {
  const product = readProducts().find(p => String(p.id) === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});
app.post('/api/products', (req, res) => {
  const { name, price, category = 'Other', stock = 0, description = '' } = req.body || {};
  if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'name is required' });
  if (!Number.isFinite(Number(price)) || Number(price) < 0) return res.status(400).json({ error: 'price must be a non-negative number' });
  if (!Number.isFinite(Number(stock)) || Number(stock) < 0) return res.status(400).json({ error: 'stock must be a non-negative number' });
  const products = readProducts();
  const product = { id: nextId(products), name: name.trim(), price: Number(price), category: String(category), stock: Number(stock), description: String(description) };
  products.push(product);
  writeProducts(products);
  res.status(201).json(product);
});
app.put('/api/products/:id', (req, res) => {
  const products = readProducts();
  const index = products.findIndex(p => String(p.id) === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Product not found' });
  const { name, price, category, stock, description } = req.body || {};
  if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'name is required' });
  if (!Number.isFinite(Number(price)) || Number(price) < 0) return res.status(400).json({ error: 'price must be a non-negative number' });
  if (!Number.isFinite(Number(stock)) || Number(stock) < 0) return res.status(400).json({ error: 'stock must be a non-negative number' });
  products[index] = { ...products[index], name: name.trim(), price: Number(price), category: String(category ?? products[index].category ?? 'Other'), stock: Number(stock), description: String(description ?? '') };
  writeProducts(products);
  res.json(products[index]);
});
app.delete('/api/products/:id', (req, res) => {
  const products = readProducts();
  const index = products.findIndex(p => String(p.id) === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Product not found' });
  const [deleted] = products.splice(index, 1);
  writeProducts(products);
  res.json({ message: 'Product deleted', product: deleted });
});

app.listen(PORT, () => console.log(`Fruit Shop API listening at http://localhost:${PORT}`));
