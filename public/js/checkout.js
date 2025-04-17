document.addEventListener('DOMContentLoaded', function() {
    const checkoutForm = document.getElementById('checkout-form');
    
    if (checkoutForm) {
      checkoutForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Clear previous error messages
        document.querySelectorAll('.error-message').forEach(el => {
          el.textContent = '';
        });
        
        // Get form data
        const formData = {
          customerName: document.getElementById('customerName').value.trim(),
          address: document.getElementById('address').value.trim(),
          mobile: document.getElementById('mobile').value.trim(),
          email: document.getElementById('email').value.trim()
        };
        
        // Validate form
        let isValid = true;
        
        // Validate name
        if (!formData.customerName) {
          document.getElementById('name-error').textContent = 'Name is required';
          isValid = false;
        }
        
        // Validate address
        if (!formData.address) {
          document.getElementById('address-error').textContent = 'Address is required';
          isValid = false;
        }
        
        // Validate mobile (Australian format)
        const mobileRegex = /^(\+61|0)[0-9]{9}$/;
        if (!formData.mobile) {
          document.getElementById('mobile-error').textContent = 'Mobile number is required';
          isValid = false;
        } else if (!mobileRegex.test(formData.mobile)) {
          document.getElementById('mobile-error').textContent = 'Please enter a valid Australian mobile number';
          isValid = false;
        }
        
        // Validate email
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!formData.email) {
          document.getElementById('email-error').textContent = 'Email is required';
          isValid = false;
        } else if (!emailRegex.test(formData.email)) {
          document.getElementById('email-error').textContent = 'Please enter a valid email address';
          isValid = false;
        }
        
        // If valid, submit the form
        if (isValid) {
          // Disable submit button to prevent double submission
          const submitButton = checkoutForm.querySelector('button[type="submit"]');
          submitButton.disabled = true;
          submitButton.textContent = 'Processing...';
          
          // Submit order
          fetch('/checkout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
          })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              // Redirect to confirmation page
              window.location.href = data.redirectUrl;
            } else {
              // Re-enable submit button
              submitButton.disabled = false;
              submitButton.textContent = 'Place Order';
              
              // Show error
              alert(data.message);
            }
          })
          .catch(error => {
            console.error('Error placing order:', error);
            alert('An error occurred while placing your order. Please try again.');
            
            // Re-enable submit button
            submitButton.disabled = false;
            submitButton.textContent = 'Place Order';
          });
        }
      });
    }
  });