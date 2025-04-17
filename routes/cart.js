const express = require('express');
const router = express.Router();
const db = require('../db');

// View cart
router.get('/', (req, res) => {
  res.render('cart', {
    title: 'Your Shopping Cart - Food Mart Grocery Store',
    cart: req.session.cart
  });
});

// Add item to cart
router.post('/add', async (req, res) => {
  try {
    const itemId = parseInt(req.body.itemId);
    const quantity = parseInt(req.body.quantity) || 1;
    
    // Get item from database
    const [item] = await db.query('SELECT * FROM items WHERE id = ?', [itemId]);
    if (item.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    
    // Check if item is in stock
    if (item[0].stock < quantity) {
      return res.status(400).json({ 
        success: false, 
        message: 'Not enough items in stock' 
      });
    }
    
    // If cart doesn't exist in session, create it
    if (!req.session.cart) {
      req.session.cart = { items: [], total: 0 };
    }
    
    // Check if item already in cart
    const existingItem = req.session.cart.items.find(i => i.id === itemId);
    
    if (existingItem) {
      // Update quantity
      existingItem.quantity += quantity;
    } else {
      // Add new item
      req.session.cart.items.push({
        id: item[0].id,
        name: item[0].name,
        price: item[0].price,
        image: item[0].image,
        unit: item[0].unit,
        quantity: quantity
      });
    }
    
    // Update total
    req.session.cart.total = req.session.cart.items.reduce(
      (total, item) => total + (item.price * item.quantity), 
      0
    );
    
    // Save cart to database if needed
    if (!req.session.cart.id) {
      const [result] = await db.query(
        'INSERT INTO carts (session_id) VALUES (?)', 
        [req.sessionID]
      );
      req.session.cart.id = result.insertId;
      
      // Save cart items
      for (const item of req.session.cart.items) {
        await db.query(
          'INSERT INTO cart_items (cart_id, item_id, quantity) VALUES (?, ?, ?)',
          [req.session.cart.id, item.id, item.quantity]
        );
      }
    } else {
      // Update or insert cart items
      for (const item of req.session.cart.items) {
        const [existing] = await db.query(
          'SELECT * FROM cart_items WHERE cart_id = ? AND item_id = ?',
          [req.session.cart.id, item.id]
        );
        
        if (existing.length > 0) {
          await db.query(
            'UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND item_id = ?',
            [item.quantity, req.session.cart.id, item.id]
          );
        } else {
          await db.query(
            'INSERT INTO cart_items (cart_id, item_id, quantity) VALUES (?, ?, ?)',
            [req.session.cart.id, item.id, item.quantity]
          );
        }
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Item added to cart',
      cartCount: req.session.cart.items.reduce((sum, item) => sum + item.quantity, 0) 
    });
  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({ success: false, message: 'Failed to add item to cart' });
  }
});

// Update item quantity in cart
router.post('/update', async (req, res) => {
  try {
    const itemId = parseInt(req.body.itemId);
    const quantity = parseInt(req.body.quantity);
    
    if (quantity < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
    }
    
    // Check if item exists and has enough stock
    const [item] = await db.query('SELECT * FROM items WHERE id = ?', [itemId]);
    if (item.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    
    if (item[0].stock < quantity) {
      return res.status(400).json({ 
        success: false, 
        message: 'Not enough items in stock' 
      });
    }
    
    // Update item in cart
    const cartItem = req.session.cart.items.find(i => i.id === itemId);
    if (cartItem) {
      cartItem.quantity = quantity;
      
      // Update database if cart exists
      if (req.session.cart.id) {
        await db.query(
          'UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND item_id = ?',
          [quantity, req.session.cart.id, itemId]
        );
      }
      
      // Recalculate total
      req.session.cart.total = req.session.cart.items.reduce(
        (total, item) => total + (item.price * item.quantity), 
        0
      );
      
      res.json({ 
        success: true, 
        message: 'Cart updated',
        itemTotal: cartItem.price * cartItem.quantity,
        cartTotal: req.session.cart.total,
        cartCount: req.session.cart.items.reduce((sum, item) => sum + item.quantity, 0)
      });
    } else {
      res.status(404).json({ success: false, message: 'Item not in cart' });
    }
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ success: false, message: 'Failed to update cart' });
  }
});

// Remove item from cart
router.post('/remove', async (req, res) => {
  try {
    const itemId = parseInt(req.body.itemId);
    
    // Remove item from cart
    req.session.cart.items = req.session.cart.items.filter(i => i.id !== itemId);
    
    // Recalculate total
    req.session.cart.total = req.session.cart.items.reduce(
      (total, item) => total + (item.price * item.quantity), 
      0
    );
    
    // Update database if cart exists
    if (req.session.cart.id) {
      await db.query(
        'DELETE FROM cart_items WHERE cart_id = ? AND item_id = ?',
        [req.session.cart.id, itemId]
      );
    }
    
    res.json({ 
      success: true, 
      message: 'Item removed from cart',
      cartTotal: req.session.cart.total,
      cartCount: req.session.cart.items.reduce((sum, item) => sum + item.quantity, 0)
    });
  } catch (error) {
    console.error('Error removing item from cart:', error);
    res.status(500).json({ success: false, message: 'Failed to remove item from cart' });
  }
});

// Clear cart
router.post('/clear', async (req, res) => {
  try {
    // Clear cart in session
    req.session.cart.items = [];
    req.session.cart.total = 0;
    
    // Clear cart in database if it exists
    if (req.session.cart.id) {
      await db.query('DELETE FROM cart_items WHERE cart_id = ?', [req.session.cart.id]);
    }
    
    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ success: false, message: 'Failed to clear cart' });
  }
});

module.exports = router;