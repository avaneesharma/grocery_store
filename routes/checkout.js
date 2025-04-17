const express = require('express');
const router = express.Router();
const db = require('../db');
const nodemailer = require('nodemailer');

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.mailtrap.io', // Replace with actual SMTP server
  port: 2525,  // Replace with actual port
  auth: {
    user: 'your_username', // Replace with actual credentials
    pass: 'your_password'
  }
});

// Show checkout page
router.get('/', async (req, res) => {
  // Redirect to cart if cart is empty
  if (!req.session.cart || req.session.cart.items.length === 0) {
    return res.redirect('/cart');
  }
  
  res.render('checkout', {
    title: 'Checkout - Food Mart Grocery Store',
    cart: req.session.cart
  });
});

// Process checkout
router.post('/', async (req, res) => {
  try {
    // Validate cart is not empty
    if (!req.session.cart || req.session.cart.items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Your cart is empty' 
      });
    }
    
    // Validate required fields
    const { customerName, address, mobile, email } = req.body;
    if (!customerName || !address || !mobile || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }
    
    // Validate mobile (Australian format)
    const mobileRegex = /^(\+61|0)[0-9]{9}$/;
    if (!mobileRegex.test(mobile)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please enter a valid Australian mobile number' 
      });
    }
    
    // Validate email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please enter a valid email address' 
      });
    }
    
    // Check stock availability
    for (const cartItem of req.session.cart.items) {
      const [item] = await db.query('SELECT * FROM items WHERE id = ?', [cartItem.id]);
      if (item.length === 0 || item[0].stock < cartItem.quantity) {
        return res.status(400).json({ 
          success: false, 
          message: `${cartItem.name} is no longer available in the requested quantity` 
        });
      }
    }
    
    // Create order in database
    const [orderResult] = await db.query(
      'INSERT INTO orders (customer_name, address, mobile, email) VALUES (?, ?, ?, ?)',
      [customerName, address, mobile, email]
    );
    
    const orderId = orderResult.insertId;
    
    // Add order items
    for (const item of req.session.cart.items) {
      await db.query(
        'INSERT INTO order_items (order_id, item_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.id, item.quantity, item.price]
      );
      
      // Update stock
      await db.query(
        'UPDATE items SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.id]
      );
    }
    
    // Send confirmation email
    const mailOptions = {
      from: '"Food Mart Grocery Store" <no-reply@foodmart.com>',
      to: email,
      subject: 'Order Confirmation - Food Mart Grocery Store',
      html: `
        <h1>Order Confirmation</h1>
        <p>Dear ${customerName},</p>
        <p>Thank you for your order! Here are your order details:</p>
        <h2>Order #${orderId}</h2>
        <table border="1" cellpadding="10" cellspacing="0">
          <tr>
            <th>Item</th>
            <th>Unit</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
          ${req.session.cart.items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.unit}</td>
              <td>${item.quantity}</td>
              <td>$${item.price.toFixed(2)}</td>
              <td>$${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          `).join('')}
        </table>
        <h3>Total: $${req.session.cart.total.toFixed(2)}</h3>
        <p>Delivery Address: ${address}</p>
        <p>Contact: ${mobile}</p>
        <p>Thank you for shopping with us!</p>
      `
    };
    
    await transporter.sendMail(mailOptions);
    
    // Clear the cart
    if (req.session.cart.id) {
      await db.query('DELETE FROM cart_items WHERE cart_id = ?', [req.session.cart.id]);
    }
    req.session.cart = { items: [], total: 0 };
    
    // Redirect to confirmation page
    res.json({ 
      success: true, 
      orderId: orderId,
      redirectUrl: `/checkout/confirmation/${orderId}`
    });
  } catch (error) {
    console.error('Error processing order:', error);
    res.status(500).json({ success: false, message: 'Failed to process your order' });
  }
});

// Order confirmation page
router.get('/confirmation/:orderId', async (req, res) => {
  try {
    const orderId = req.params.orderId;
    
    // Get order details
    const [order] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (order.length === 0) {
      return res.status(404).send('Order not found');
    }
    
    // Get order items
    const [orderItems] = await db.query(`
      SELECT oi.*, i.name, i.unit
      FROM order_items oi
      JOIN items i ON oi.item_id = i.id
      WHERE oi.order_id = ?
    `, [orderId]);
    
    // Calculate total
    const total = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    res.render('confirmation', {
      title: 'Order Confirmation - Food Mart Grocery Store',
      order: order[0],
      orderItems: orderItems,
      total: total
    });
  } catch (error) {
    console.error('Error loading order confirmation:', error);
    res.status(500).send('Error loading order confirmation');
  }
});

module.exports = router;