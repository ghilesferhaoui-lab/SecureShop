require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 8004;

// Security middleware
app.use(helmet());
app.use(express.json());

// Rate limiting - stricter for payment service
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 50,
  message: 'Too many payment requests'
});
app.use('/api/payments', limiter);

// In-memory storage (use proper database in production)
const transactions = new Map();

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  next();
};

// Payment endpoints
app.post('/api/payments', verifyToken, (req, res) => {
  try {
    const { orderId, amount, cardToken } = req.body;

    if (!orderId || !amount || !cardToken) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const transactionId = uuidv4();
    const transaction = {
      transactionId,
      orderId,
      amount,
      status: 'completed',
      processedAt: new Date(),
      cardLast4: cardToken.slice(-4) // Never store full card token
    };

    transactions.set(transactionId, transaction);

    res.status(201).json({
      transactionId,
      status: 'completed',
      message: 'Payment processed successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/payments/:transactionId', verifyToken, (req, res) => {
  try {
    const transaction = transactions.get(req.params.transactionId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/payments/order/:orderId', verifyToken, (req, res) => {
  try {
    const orderTransactions = Array.from(transactions.values())
      .filter(t => t.orderId === req.params.orderId);
    res.json(orderTransactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'payment-service' });
});

app.listen(PORT, () => {
  console.log(`Payment Service running on port ${PORT}`);
});
