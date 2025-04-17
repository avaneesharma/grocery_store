document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const qtyInputs = document.querySelectorAll('.qty-input');
    const decreaseButtons = document.querySelectorAll('.decrease');
    const increaseButtons = document.querySelectorAll('.increase');
    const removeButtons = document.querySelectorAll('.remove-btn');
    const clearCartButton = document.getElementById('clear-cart');
    
    // Update quantity when input changes
    qtyInputs.forEach(input => {
      input.addEventListener('change', function() {
        const cartItem = this.closest('.cart-item');
        const itemId = parseInt(cartItem.dataset.id);
        const quantity = parseInt(this.value);
        
        if (quantity < 1) {
          this.value = 1;
          return;
        }
        
        updateCartItem(itemId, quantity, cartItem);
      });
    });
    
    // Decrease quantity
    decreaseButtons.forEach(button => {
      button.addEventListener('click', function() {
        const cartItem = this.closest('.cart-item');
        const input = cartItem.querySelector('.qty-input');
        const itemId = parseInt(cartItem.dataset.id);
        const currentQty = parseInt(input.value);
        
        if (currentQty > 1) {
          const newQty = currentQty - 1;
          input.value = newQty;
          updateCartItem(itemId, newQty, cartItem);
        }
      });
    });
    
    // Increase quantity
    increaseButtons.forEach(button => {
      button.addEventListener('click', function() {
        const cartItem = this.closest('.cart-item');
        const input = cartItem.querySelector('.qty-input');
        const itemId = parseInt(cartItem.dataset.id);
        const currentQty = parseInt(input.value);
        
        const newQty = currentQty + 1;
        input.value = newQty;
        updateCartItem(itemId, newQty, cartItem);
      });
    });
    
    // Remove item from cart
    removeButtons.forEach(button => {
      button.addEventListener('click', function() {
        const cartItem = this.closest('.cart-item');
        const itemId = parseInt(cartItem.dataset.id);
        
        if (confirm('Are you sure you want to remove this item from your cart?')) {
          removeFromCart(itemId, cartItem);
        }
      });
    });
    
    // Clear entire cart
    if (clearCartButton) {
      clearCartButton.addEventListener('click', function() {
        if (confirm('Are you sure you want to clear your entire cart?')) {
          clearCart();
        }
      });
    }
    
    // Update cart item quantity
    function updateCartItem(itemId, quantity, cartItem) {
      fetch('/cart/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ itemId, quantity })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Update subtotal
          const price = parseFloat(cartItem.querySelector('.price').textContent.replace('$', ''));
          cartItem.querySelector('.subtotal').textContent = `$${(price * quantity).toFixed(2)}`;
          
          // Update cart total
          document.querySelector('.total-price').textContent = `$${data.cartTotal.toFixed(2)}`;
          
          // Update cart count in header
          updateCartCount(data.cartCount);
        } else {
          alert(data.message);
          // Reset input to previous value
          location.reload();
        }
      })
      .catch(error => {
        console.error('Error updating cart:', error);
        alert('Failed to update cart. Please try again.');
      });
    }
    
    // Remove item from cart
    function removeFromCart(itemId, cartItem) {
      fetch('/cart/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ itemId })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Remove the item from DOM
          cartItem.remove();
          
          // Update cart total
          document.querySelector('.total-price').textContent = `$${data.cartTotal.toFixed(2)}`;
          
          // Update cart count in header
          updateCartCount(data.cartCount);
          
          // If cart is empty, reload the page to show empty cart message
          if (data.cartCount === 0) {
            location.reload();
          }
        } else {
          alert(data.message);
        }
      })
      .catch(error => {
        console.error('Error removing item:', error);
        alert('Failed to remove item. Please try again.');
      });
    }
    
    // Clear entire cart
    function clearCart() {
      fetch('/cart/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          location.reload();
        } else {
          alert(data.message);
        }
      })
      .catch(error => {
        console.error('Error clearing cart:', error);
        alert('Failed to clear cart. Please try again.');
      });
    }
    
    // Update cart count in header
    function updateCartCount(count) {
      const cartCountElement = document.querySelector('.cart-count');
      if (cartCountElement) {
        cartCountElement.textContent = count;
      }
    }
  });