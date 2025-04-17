const express = require('express');
const router = express.Router();
const db = require('../db');

// Home page
router.get('/', async (req, res) => {
  try {
    // Get all categories
    const [categories] = await db.query('SELECT * FROM categories WHERE parent_id IS NULL');
    
    // Get subcategories for each category
    for (let category of categories) {
      const [subcategories] = await db.query('SELECT * FROM categories WHERE parent_id = ?', [category.id]);
      category.subcategories = subcategories;
    }
    
    // Get items with stock info
    const [items] = await db.query('SELECT * FROM items');
    
    res.render('home', {
      title: 'Food Mart Grocery Store',
      categories: categories,
      items: items
    });
  } catch (error) {
    console.error('Error loading homepage:', error);
    res.status(500).send('Error loading the home page');
  }
});

// Search functionality
router.get('/search', async (req, res) => {
  try {
    const searchQuery = req.query.q;
    if (!searchQuery) {
      return res.redirect('/');
    }

    // Search items by name or description
    const [items] = await db.query(
      'SELECT * FROM items WHERE name LIKE ? OR description LIKE ?', 
      [`%${searchQuery}%`, `%${searchQuery}%`]
    );

    // Get all categories for navigation
    const [categories] = await db.query('SELECT * FROM categories WHERE parent_id IS NULL');
    for (let category of categories) {
      const [subcategories] = await db.query('SELECT * FROM categories WHERE parent_id = ?', [category.id]);
      category.subcategories = subcategories;
    }

    res.render('search-results', {
      title: `Search Results for "${searchQuery}" - Food Mart Grocery Store`,
      searchQuery: searchQuery,
      items: items,
      categories: categories
    });
  } catch (error) {
    console.error('Error during search:', error);
    res.status(500).send('Error processing search request');
  }
});

// Category page
router.get('/category/:id', async (req, res) => {
  try {
    const categoryId = req.params.id;
    
    // Get the category
    const [category] = await db.query('SELECT * FROM categories WHERE id = ?', [categoryId]);
    if (category.length === 0) {
      return res.status(404).send('Category not found');
    }

    // Get all items in this category
    const [items] = await db.query('SELECT * FROM items WHERE category_id = ?', [categoryId]);
    
    // Get all categories for navigation
    const [categories] = await db.query('SELECT * FROM categories WHERE parent_id IS NULL');
    for (let cat of categories) {
      const [subcategories] = await db.query('SELECT * FROM categories WHERE parent_id = ?', [cat.id]);
      cat.subcategories = subcategories;
    }

    res.render('category', {
      title: `${category[0].name} - Food Mart Grocery Store`,
      currentCategory: category[0],
      items: items,
      categories: categories
    });
  } catch (error) {
    console.error('Error loading category:', error);
    res.status(500).send('Error loading category page');
  }
});

module.exports = router;