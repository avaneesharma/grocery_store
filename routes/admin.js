const express = require('express');
const router = express.Router();
const db = require('../db');

// Admin authentication middleware
const isAdmin = (req, res, next) => {
  if (req.session.isAdmin) {
    next();
  } else {
    res.redirect('/admin/login');
  }
};

// Admin login page
router.get('/login', (req, res) => {
  res.render('admin-login', {
    title: 'Admin Login - Food Mart Grocery Store'
  });
});

// Process admin login
router.post('/login', async (req, res) => {
  try {
    const { email, mobile } = req.body;
    
    // Validate credentials
    const [admin] = await db.query(
      'SELECT * FROM admin WHERE email = ? AND mobile = ?',
      [email, mobile]
    );
    
    if (admin.length > 0) {
      // Set admin session
      req.session.isAdmin = true;
      req.session.adminId = admin[0].id;
      res.redirect('/admin/dashboard');
    } else {
      res.render('admin-login', {
        title: 'Admin Login - Food Mart Grocery Store',
        error: 'Invalid credentials'
      });
    }
  } catch (error) {
    console.error('Error during admin login:', error);
    res.status(500).send('Error processing login request');
  }
});

// Admin logout
router.get('/logout', (req, res) => {
  req.session.isAdmin = false;
  req.session.adminId = null;
  res.redirect('/admin/login');
});

// Admin dashboard
router.get('/dashboard', isAdmin, async (req, res) => {
  try {
    // Get all orders with customer details
    const [orders] = await db.query(`
      SELECT o.*, 
             COUNT(oi.id) as item_count, 
             SUM(oi.quantity * oi.price) as total_amount
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `);
    
    res.render('admin-dashboard', {
      title: 'Admin Dashboard - Food Mart Grocery Store',
      orders: orders
    });
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    res.status(500).send('Error loading admin dashboard');
  }
});

// View specific order
router.get('/order/:id', isAdmin, async (req, res) => {
  try {
    const orderId = req.params.id;
    
    // Get order details
    const [order] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (order.length === 0) {
      return res.status(404).send('Order not found');
    }
    
    // Get order items with product details
    const [orderItems] = await db.query(`
      SELECT oi.*, i.name, i.unit
      FROM order_items oi
      JOIN items i ON oi.item_id = i.id
      WHERE oi.order_id = ?
    `, [orderId]);
    
    // Calculate total
    const total = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    res.render('admin-order-detail', {
      title: `Order #${orderId} - Food Mart Grocery Store`,
      order: order[0],
      orderItems: orderItems,
      total: total
    });
  } catch (error) {
    console.error('Error viewing order:', error);
    res.status(500).send('Error loading order details');
  }
});

module.exports = router;