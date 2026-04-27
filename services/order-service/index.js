require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 8003;

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

// In-memory storage (replace with database in production)
const orders = new Map();
const carts = new Map();

// Middleware to verify JWT token from request headers
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  // In production, verify JWT properly
  next();
};

// Cart endpoints
app.post('/api/cart', verifyToken, (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'unknown';
    const cartId = uuidv4();
    carts.set(cartId, { userId, items: [], createdAt: new Date() });
    res.status(201).json({ cartId, message: 'Cart created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/cart/:cartId', verifyToken, (req, res) => {
  try {
    const cart = carts.get(req.params.cartId);
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cart/:cartId/items', verifyToken, (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const cart = carts.get(req.params.cartId);
    
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    
    cart.items.push({ productId, quantity, addedAt: new Date() });
    res.json({ message: 'Item added to cart', cart });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Order endpoints
app.post('/api/orders', verifyToken, async (req, res) => {
  try {
    const { cartId, shippingAddress } = req.body;
    const cart = carts.get(cartId);
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const orderId = uuidv4();
    const order = {
      orderId,
      userId: cart.userId,
      items: cart.items,
      shippingAddress,
      status: 'pending',
      createdAt: new Date(),
      totalAmount: 0
    };

    orders.set(orderId, order);
    carts.delete(cartId);

    res.status(201).json({ orderId, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders/:orderId', verifyToken, (req, res) => {
  try {
    const order = orders.get(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders', verifyToken, (req, res) => {
  try {
    const allOrders = Array.from(orders.values());
    res.json(allOrders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'order-service' });
});

app.listen(PORT, () => {
  console.log(`Order Service running on port ${PORT}`);
});
