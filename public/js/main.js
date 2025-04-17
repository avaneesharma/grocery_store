document.addEventListener('DOMContentLoaded', function() {
    // Add to cart functionality
    const addToCartButtons = document.querySelectorAll('.item-card button:not(.disabled)');
    
    addToCartButtons.forEach(button => {
      button.addEventListener('click', function() {
        const itemCard = this.closest('.item-card');
        const itemId = itemCard.getAttribute('data-id');
        
        addToCart(itemId);
      });
    });
    
    // Function to add item to cart
    function addToCart(itemId) {
      fetch('/cart/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ itemId, quantity: 1 })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Update cart count
          const cartCount = document.querySelector('.cart-count');
          if (cartCount) {
            cartCount.textContent = data.cartCount;
          }
          
          // Show success message
          showNotification('Item added to cart!', 'success');
        } else {
          showNotification(data.message, 'error');
        }
      })
      .catch(error => {
        console.error('Error adding to cart:', error);
        showNotification('Failed to add item to cart', 'error');
      });
    }
    
    // Function to show notification
    function showNotification(message, type) {
      // Create notification element
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.textContent = message;
      
      // Add notification to the page
      document.body.appendChild(notification);
      
      // Show notification
      setTimeout(() => {
        notification.classList.add('show');
      }, 10);
      
      // Hide and remove notification after a delay
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
          notification.remove();
        }, 300);
      }, 3000);
    }
  });