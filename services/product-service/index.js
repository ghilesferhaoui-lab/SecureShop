require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 8002;

// Security middleware
app.use(helmet());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP'
});
app.use(limiter);

// In-memory product database
const products = new Map([
  ['PROD001', { id: 'PROD001', name: 'Laptop', price: 999.99, category: 'Electronics', stock: 50 }],
  ['PROD002', { id: 'PROD002', name: 'Wireless Mouse', price: 29.99, category: 'Electronics', stock: 200 }],
  ['PROD003', { id: 'PROD003', name: 'USB-C Cable', price: 9.99, category: 'Accessories', stock: 500 }],
  ['PROD004', { id: 'PROD004', name: 'Monitor', price: 299.99, category: 'Electronics', stock: 30 }],
  ['PROD005', { id: 'PROD005', name: 'Keyboard', price: 79.99, category: 'Electronics', stock: 100 }]
]);

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  next();
};

// Get all products
app.get('/api/products', (req, res) => {
  try {
    const productList = Array.from(products.values());
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category;

    let filtered = productList;
    if (category) {
      filtered = productList.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }

    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    res.json({
      products: paginated,
      total: filtered.length,
      page,
      pages: Math.ceil(filtered.length / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get product by ID
app.get('/api/products/:productId', (req, res) => {
  try {
    const product = products.get(req.params.productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create product (admin only)
app.post('/api/products', verifyToken, (req, res) => {
  try {
    const { id, name, price, category, stock } = req.body;

    if (!id || !name || !price || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (products.has(id)) {
      return res.status(409).json({ error: 'Product already exists' });
    }

    const product = { id, name, price, category, stock: stock || 0 };
    products.set(id, product);

    res.status(201).json({ message: 'Product created', product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update product (admin only)
app.put('/api/products/:productId', verifyToken, (req, res) => {
  try {
    const product = products.get(req.params.productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const { name, price, category, stock } = req.body;
    if (name) product.name = name;
    if (price) product.price = price;
    if (category) product.category = category;
    if (stock !== undefined) product.stock = stock;

    res.json({ message: 'Product updated', product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search products
app.get('/api/products/search/:query', (req, res) => {
  try {
    const query = req.params.query.toLowerCase();
    const results = Array.from(products.values()).filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query)
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'product-service' });
});

app.listen(PORT, () => {
  console.log(`Product Service running on port ${PORT}`);
});
