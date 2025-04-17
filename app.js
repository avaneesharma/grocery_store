const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const nodemailer = require('nodemailer');

// Import routes
const indexRoutes = require('./routes/index');
const cartRoutes = require('./routes/cart');
const checkoutRoutes = require('./routes/checkout');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');

// Database connection
const db = require('./db');

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session configuration
app.use(session({
  secret: 'grocery_store_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 20 * 60 * 1000 } // 20 minutes as per requirement
}));

// Make cart available to all templates
app.use((req, res, next) => {
  if (!req.session.cart) {
    req.session.cart = {
      id: null,
      items: [],
      total: 0
    };
  }
  res.locals.cartItemCount = req.session.cart.items.reduce((sum, item) => sum + item.quantity, 0);
  next();
});

// Routes
app.use('/', indexRoutes);
app.use('/cart', cartRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;