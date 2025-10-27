// script.js
document.addEventListener('DOMContentLoaded', function() {
    // Remove database connection warning
    removeDatabaseWarning();
    
    // Initialize menu functionality
    initializeMenu();
    
    // Initialize order functionality
    initializeOrderSystem();
});

function removeDatabaseWarning() {
    // Remove any database warning elements
    const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, div, section');
    elements.forEach(element => {
        const text = element.textContent || element.innerText;
        if (text.includes('Database Connection Warning') || 
            text.includes('Firebase configuration') ||
            text.includes('Order saving is disabled')) {
            element.style.display = 'none';
        }
    });
}

function initializeMenu() {
    // Menu category filtering
    const categoryButtons = document.querySelectorAll('[data-category]');
    const menuItems = document.querySelectorAll('.menu-item');
    
    if (categoryButtons.length > 0) {
        categoryButtons.forEach(button => {
            button.addEventListener('click', function() {
                const category = this.getAttribute('data-category');
                
                // Update active button
                categoryButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                // Filter menu items
                menuItems.forEach(item => {
                    if (category === 'all' || item.getAttribute('data-category') === category) {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        });
    }
}

function initializeOrderSystem() {
    let cart = [];
    const orderButton = document.querySelector('#order-button');
    const cartElement = document.querySelector('#cart');
    
    // Add to cart functionality
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', function() {
            const itemElement = this.closest('.menu-item');
            const itemName = itemElement.querySelector('h3').textContent;
            const itemPrice = parseFloat(itemElement.querySelector('.price').textContent.replace('$', ''));
            const itemDescription = itemElement.querySelector('p').textContent;
            
            addToCart({
                name: itemName,
                price: itemPrice,
                description: itemDescription
            });
        });
    });
    
    function addToCart(item) {
        cart.push(item);
        updateCartDisplay();
        showNotification(`Added ${item.name} to cart!`);
    }
    
    function updateCartDisplay() {
        if (cartElement) {
            if (cart.length === 0) {
                cartElement.innerHTML = '<p>Your cart is empty</p>';
            } else {
                let cartHTML = '<h3>Your Order</h3>';
                let total = 0;
                
                cart.forEach((item, index) => {
                    cartHTML += `
                        <div class="cart-item">
                            <span>${item.name} - $${item.price.toFixed(2)}</span>
                            <button onclick="removeFromCart(${index})">×</button>
                        </div>
                    `;
                    total += item.price;
                });
                
                cartHTML += `<div class="cart-total">Total: $${total.toFixed(2)}</div>`;
                cartHTML += `<button class="checkout-btn" onclick="checkout()">Place Order</button>`;
                
                cartElement.innerHTML = cartHTML;
            }
        }
    }
    
    // Make functions globally available for onclick handlers
    window.removeFromCart = function(index) {
        cart.splice(index, 1);
        updateCartDisplay();
    };
    
    window.checkout = async function() {
        if (cart.length === 0) {
            alert('Your cart is empty!');
            return;
        }
        
        try {
            // Show loading state
            const checkoutBtn = document.querySelector('.checkout-btn');
            if (checkoutBtn) {
                checkoutBtn.textContent = 'Processing...';
                checkoutBtn.disabled = true;
            }
            
            // Prepare order data
            const orderData = {
                items: cart,
                total: cart.reduce((sum, item) => sum + item.price, 0),
                customerName: prompt('Please enter your name:') || 'Walk-in Customer',
                timestamp: new Date().toISOString()
            };
            
            // Submit to local server
            const result = await submitOrder(orderData);
            
            if (result.success) {
                // Show success message
                showNotification(`Order placed successfully! Order #: ${result.orderNumber}`);
                
                // Clear cart
                cart = [];
                updateCartDisplay();
                
                // Show order confirmation
                setTimeout(() => {
                    alert(`🎉 Order Confirmed!\n\nOrder Number: ${result.orderNumber}\nTotal: $${orderData.total.toFixed(2)}\n\nThank you for your order!`);
                }, 500);
                
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('Checkout error:', error);
            showNotification('Order failed: ' + error.message, 'error');
        } finally {
            // Reset button
            const checkoutBtn = document.querySelector('.checkout-btn');
            if (checkoutBtn) {
                checkoutBtn.textContent = 'Place Order';
                checkoutBtn.disabled = false;
            }
        }
    };
}

// Order submission to LOCAL server
async function submitOrder(orderData) {
    try {
        const response = await fetch('/api/order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
            return { success: true, orderNumber: result.orderNumber };
        } else {
            throw new Error(result.message || 'Order failed');
        }
    } catch (error) {
        console.error('Order submission error:', error);
        
        // Fallback: save locally to localStorage
        saveOrderLocally(orderData);
        
        return { 
            success: false, 
            error: `Could not save order to server. Saved a copy locally for retrieval. Error: ${error.message}`
        };
    }
}

// Local storage fallback
function saveOrderLocally(orderData) {
    try {
        const localOrders = JSON.parse(localStorage.getItem('localOrders') || '[]');
        const localOrder = {
            ...orderData,
            localSaveTime: new Date().toISOString(),
            localId: 'local-' + Date.now()
        };
        localOrders.push(localOrder);
        localStorage.setItem('localOrders', JSON.stringify(localOrders));
        console.log('Order saved locally as backup:', localOrder.localId);
    } catch (e) {
        console.error('Failed to save locally:', e);
    }
}

// View locally saved orders (for admin)
function viewLocalOrders() {
    const localOrders = JSON.parse(localStorage.getItem('localOrders') || '[]');
    console.log('Locally saved orders:', localOrders);
    return localOrders;
}

// Notification system
function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#f44336' : '#4CAF50'};
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    
    // Add styles for animation if not already added
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Utility function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Export functions for use in other modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        removeDatabaseWarning, 
        initializeMenu, 
        submitOrder,
        viewLocalOrders 
    };
}