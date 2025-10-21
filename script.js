// Order management system
class OrderSystem {
    constructor() {
        this.orderItems = [];
        this.subtotal = 0;
        this.tipAmount = 0;
        this.total = 0;
        this.selectedTipPercent = null;
        
        this.initializeEventListeners();
        this.updateOrderDisplay();
    }
    
    initializeEventListeners() {
        // Add to order buttons
        document.querySelectorAll('.add-to-order').forEach(button => {
            button.addEventListener('click', (e) => {
                const menuItem = e.target.closest('.menu-item');
                this.addToOrder(
                    menuItem.dataset.name,
                    parseFloat(menuItem.dataset.price)
                );
            });
        });
        
        // Tip percentage buttons
        document.querySelectorAll('.tip-option').forEach(button => {
            button.addEventListener('click', (e) => {
                this.selectTipPercent(parseInt(e.target.dataset.percent));
            });
        });
        
        // Custom tip input
        document.getElementById('custom-tip-input').addEventListener('input', (e) => {
            this.setCustomTip(parseFloat(e.target.value) || 0);
        });
        
        // Place order button
        document.getElementById('place-order-button').addEventListener('click', () => {
            this.placeOrder();
        });
        
        // Close message buttons
        document.getElementById('close-error-btn').addEventListener('click', () => {
            this.hideMessage('order-failed-message');
        });
        
        document.getElementById('close-success-btn').addEventListener('click', () => {
            this.hideMessage('order-success-message');
            this.clearOrder();
        });
    }
    
    addToOrder(name, price) {
        // Check if item already exists in order
        const existingItem = this.orderItems.find(item => item.name === name);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.orderItems.push({
                name: name,
                price: price,
                quantity: 1
            });
        }
        
        this.updateOrderDisplay();
    }
    
    removeFromOrder(index) {
        this.orderItems.splice(index, 1);
        this.updateOrderDisplay();
    }
    
    updateOrderQuantities() {
        this.orderItems.forEach((item, index) => {
            const quantityInput = document.querySelector(`.quantity-input[data-index="${index}"]`);
            if (quantityInput) {
                item.quantity = parseInt(quantityInput.value) || 1;
            }
        });
        this.updateOrderDisplay();
    }
    
    calculateSubtotal() {
        this.subtotal = this.orderItems.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);
        
        return this.subtotal;
    }
    
    calculateTip() {
        if (this.selectedTipPercent) {
            this.tipAmount = this.subtotal * (this.selectedTipPercent / 100);
        }
        // If custom tip is set, it will override percentage tip
        return this.tipAmount;
    }
    
    calculateTotal() {
        this.total = this.subtotal + this.tipAmount;
        return this.total;
    }
    
    selectTipPercent(percent) {
        this.selectedTipPercent = percent;
        this.tipAmount = this.subtotal * (percent / 100);
        
        // Update UI
        document.querySelectorAll('.tip-option').forEach(button => {
            button.classList.remove('active');
        });
        
        document.querySelector(`.tip-option[data-percent="${percent}"]`).classList.add('active');
        
        // Clear custom tip input
        document.getElementById('custom-tip-input').value = '';
        
        this.updateOrderDisplay();
    }
    
    setCustomTip(amount) {
        this.tipAmount = amount;
        this.selectedTipPercent = null;
        
        // Clear active tip buttons
        document.querySelectorAll('.tip-option').forEach(button => {
            button.classList.remove('active');
        });
        
        this.updateOrderDisplay();
    }
    
    updateOrderDisplay() {
        const orderItemsContainer = document.getElementById('order-items');
        const subtotalElement = document.getElementById('subtotal-amount');
        const tipElement = document.getElementById('tip-amount');
        const totalElement = document.getElementById('total-amount');
        
        // Calculate values
        this.calculateSubtotal();
        this.calculateTip();
        this.calculateTotal();
        
        // Update order items display
        if (this.orderItems.length === 0) {
            orderItemsContainer.innerHTML = '<p class="empty-order">No items added yet</p>';
        } else {
            orderItemsContainer.innerHTML = this.orderItems.map((item, index) => `
                <div class="order-item">
                    <div>
                        <span class="order-item-name">${item.name}</span>
                        <div class="quantity-controls">
                            <button class="quantity-btn" onclick="orderSystem.decreaseQuantity(${index})">-</button>
                            <span class="quantity">${item.quantity}</span>
                            <button class="quantity-btn" onclick="orderSystem.increaseQuantity(${index})">+</button>
                        </div>
                    </div>
                    <div>
                        <span class="order-item-price">$${(item.price * item.quantity).toFixed(2)}</span>
                        <button class="remove-item" onclick="orderSystem.removeFromOrder(${index})">×</button>
                    </div>
                </div>
            `).join('');
        }
        
        // Update totals
        subtotalElement.textContent = this.subtotal.toFixed(2);
        tipElement.textContent = this.tipAmount.toFixed(2);
        totalElement.textContent = this.total.toFixed(2);
    }
    
    increaseQuantity(index) {
        this.orderItems[index].quantity += 1;
        this.updateOrderDisplay();
    }
    
    decreaseQuantity(index) {
        if (this.orderItems[index].quantity > 1) {
            this.orderItems[index].quantity -= 1;
            this.updateOrderDisplay();
        }
    }
    
    validateOrder() {
        if (this.orderItems.length === 0) {
            this.showMessage('Please add at least one item to your order', 'error');
            return false;
        }
        
        if (this.total <= 0) {
            this.showMessage('Order total must be greater than zero', 'error');
            return false;
        }
        
        return true;
    }
    
    async placeOrder() {
        // Validate order
        if (!this.validateOrder()) {
            return;
        }
        
        // Show loading state
        const orderButton = document.getElementById('place-order-button');
        const originalText = orderButton.textContent;
        orderButton.textContent = 'Processing...';
        orderButton.disabled = true;
        
        try {
            // Simulate API call to process order
            const success = await this.processOrder();
            
            if (success) {
                this.showMessage('order-success-message');
            } else {
                this.showMessage('order-failed-message');
            }
        } catch (error) {
            console.error('Order processing error:', error);
            this.showMessage('order-failed-message');
        } finally {
            // Restore button state
            orderButton.textContent = originalText;
            orderButton.disabled = false;
        }
    }
    
    async processOrder() {
    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                items: this.orderItems,
                subtotal: this.subtotal,
                tip: this.tipAmount,
                total: this.total,
                timestamp: new Date().toISOString(),
                customer_name: "Customer" // Add customer name if needed
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log("Order saved to database!");
            return true;
        } else {
            console.error("Failed to save order");
            return false;
        }
    } catch (error) {
        console.error("Error saving order:", error);
        return false;
    }
}
    
    showMessage(messageId) {
        // Hide all messages first
        document.querySelectorAll('.order-message').forEach(msg => {
            msg.classList.add('hidden');
        });
        
        // Show the specific message
        document.getElementById(messageId).classList.remove('hidden');
    }
    
    hideMessage(messageId) {
        document.getElementById(messageId).classList.add('hidden');
    }
    
    clearOrder() {
        this.orderItems = [];
        this.tipAmount = 0;
        this.selectedTipPercent = null;
        document.getElementById('custom-tip-input').value = '';
        document.querySelectorAll('.tip-option').forEach(button => {
            button.classList.remove('active');
        });
        this.updateOrderDisplay();
    }
}

// Additional CSS for quantity controls
const additionalStyles = `
.quantity-controls {
    display: flex;
    align-items: center;
    margin-top: 5px;
}

.quantity-btn {
    width: 25px;
    height: 25px;
    border: 1px solid #ddd;
    background: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.quantity {
    margin: 0 10px;
    font-weight: bold;
}

.remove-item {
    background: #f44336;
    color: white;
    border: none;
    width: 25px;
    height: 25px;
    border-radius: 50%;
    cursor: pointer;
    margin-left: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Initialize order system when DOM is loaded
let orderSystem;
document.addEventListener('DOMContentLoaded', () => {
    orderSystem = new OrderSystem();
});