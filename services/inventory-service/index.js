require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 8006;

// Security middleware
app.use(helmet());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: 'Too many requests'
});
app.use(limiter);

// In-memory stock database
const inventory = new Map([
  ['PROD001', { productId: 'PROD001', stock: 100, reserved: 0 }],
  ['PROD002', { productId: 'PROD002', stock: 50, reserved: 0 }],
  ['PROD003', { productId: 'PROD003', stock: 200, reserved: 0 }]
]);

const reservations = new Map();

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  next();
};

// Get stock level
app.get('/api/inventory/:productId', verifyToken, (req, res) => {
  try {
    const item = inventory.get(req.params.productId);
    if (!item) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({
      productId: item.productId,
      available: item.stock - item.reserved,
      reserved: item.reserved,
      total: item.stock
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reserve stock
app.post('/api/inventory/reserve', verifyToken, (req, res) => {
  try {
    const { productId, quantity, orderId } = req.body;

    if (!productId || !quantity || !orderId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const item = inventory.get(productId);
    if (!item) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const available = item.stock - item.reserved;
    if (available < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    item.reserved += quantity;
    reservations.set(orderId, { productId, quantity, createdAt: new Date() });

    res.status(201).json({ message: 'Stock reserved', available: available - quantity });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Release reservation
app.post('/api/inventory/release', verifyToken, (req, res) => {
  try {
    const { orderId, productId } = req.body;

    const reservation = reservations.get(orderId);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const item = inventory.get(productId);
    if (item) {
      item.reserved = Math.max(0, item.reserved - reservation.quantity);
    }

    reservations.delete(orderId);
    res.json({ message: 'Reservation released' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'inventory-service' });
});

app.listen(PORT, () => {
  console.log(`Inventory Service running on port ${PORT}`);
});
