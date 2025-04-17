const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const [categories] = await db.query('SELECT * FROM categories WHERE parent_id IS NULL');
    
    // Get subcategories for each category
    for (let category of categories) {
      const [subcategories] = await db.query(
        'SELECT * FROM categories WHERE parent_id = ?', 
        [category.id]
      );
      category.subcategories = subcategories;
    }
    
    res.json({ success: true, categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

// Get items by category
router.get('/category/:id/items', async (req, res) => {
  try {
    const categoryId = req.params.id;
    const [items] = await db.query('SELECT * FROM items WHERE category_id = ?', [categoryId]);
    res.json({ success: true, items });
  } catch (error) {
    console.error('Error fetching items by category:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch items' });
  }
});

// Search items
router.get('/search', async (req, res) => {
  try {
    const searchQuery = req.query.q;
    if (!searchQuery) {
      return res.json({ success: false, message: 'Search query is required' });
    }

    const [items] = await db.query(
      'SELECT * FROM items WHERE name LIKE ? OR description LIKE ?', 
      [`%${searchQuery}%`, `%${searchQuery}%`]
    );

    res.json({ success: true, items });
  } catch (error) {
    console.error('Error searching items:', error);
    res.status(500).json({ success: false, message: 'Failed to search items' });
  }
});

// Check stock availability
router.get('/items/:id/stock', async (req, res) => {
  try {
    const itemId = req.params.id;
    const [item] = await db.query('SELECT id, stock FROM items WHERE id = ?', [itemId]);
    
    if (item.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    
    res.json({ 
      success: true, 
      itemId: item[0].id,
      inStock: item[0].stock > 0,
      stock: item[0].stock
    });
  } catch (error) {
    console.error('Error checking stock:', error);
    res.status(500).json({ success: false, message: 'Failed to check stock' });
  }
});

// Get cart summary (item count and total)
router.get('/cart-summary', (req, res) => {
  try {
    if (!req.session.cart) {
      return res.json({ success: true, count: 0, total: 0 });
    }
    
    const count = req.session.cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const total = req.session.cart.total || 0;
    
    res.json({ success: true, count, total });
  } catch (error) {
    console.error('Error fetching cart summary:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch cart summary' });
  }
});

// Get recent orders (for logged in users, if authentication is implemented)
router.get('/recent-orders', async (req, res) => {
  try {
    // This would typically check if user is logged in
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const userId = req.session.userId;
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
      [userId]
    );
    
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recent orders' });
  }
});

// Get featured items (could be used on homepage)
router.get('/featured-items', async (req, res) => {
  try {
    // This would typically fetch items marked as featured in the database
    // For now, just return some of the available items
    const [items] = await db.query('SELECT * FROM items WHERE stock > 0 LIMIT 8');
    res.json({ success: true, items });
  } catch (error) {
    console.error('Error fetching featured items:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch featured items' });
  }
});

// Admin-specific endpoints
// Get orders for admin dashboard
router.get('/admin/orders', async (req, res) => {
  try {
    // Check if user is admin
    if (!req.session.isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    const [orders] = await db.query(`
      SELECT o.*, 
             COUNT(oi.id) as item_count, 
             SUM(oi.quantity * oi.price) as total_amount
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `);
    
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching admin orders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

module.exports = router;