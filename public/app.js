// Enhanced F&B Order Kiosk Application
// Fallback demo menu used when server menu fetch fails
const DEV_MOCK_MENU = [
    { id: 'item_c1', name: 'Espresso', description: 'Strong double shot of our signature blend.', price: 3.50, category: 'Coffee' },
    { id: 'item_c2', name: 'Latte', description: 'Espresso with steamed milk and a thin layer of foam.', price: 5.00, category: 'Coffee' },
    { id: 'item_p1', name: 'Chocolate Croissant', description: 'Flaky pastry filled with dark chocolate.', price: 3.80, category: 'Pastries' },
    { id: 'item_d1', name: 'Iced Lemon Tea', description: 'Refreshing black tea with a hint of lemon.', price: 4.00, category: 'Drinks' }
];

class OrderKiosk {
    constructor() {
        this.menuData = [];
        this.cart = new Map();
        this.subTotal = 0;
        this.tipAmount = 0;
        this.total = 0;
        this.activeCategory = 'All';
        this.isLoading = false;
        
        this.initializeElements();
        this.bindEvents();
        this.loadMenu();
    }

    initializeElements() {
        // Main containers
        this.menuContainer = document.getElementById('menu-container');
        this.loadingSpinner = document.getElementById('loading-spinner');
        this.filterContainer = document.getElementById('filter-container');
        this.cartContainer = document.getElementById('cart-items-container');
        this.emptyCartMessage = document.getElementById('empty-cart-message');
        
        // Cart elements
        this.cartTotalDisplay = document.getElementById('cart-total');
        this.subTotalDisplay = document.getElementById('subtotal-display');
        this.tipDisplay = document.getElementById('tip-amount-display');
        this.customerNameInput = document.getElementById('customer-name');
        this.checkoutBtn = document.getElementById('checkout-btn');
        this.checkoutText = document.getElementById('checkout-text');
        this.checkoutLoading = document.getElementById('checkout-loading');
        
        // Tip elements
        this.customTipInput = document.getElementById('custom-tip');
        this.tipButtons = document.querySelectorAll('.tip-btn:not(#clear-tip-btn)');
        this.clearTipBtn = document.getElementById('clear-tip-btn');
        
        // Modal elements
        this.statusModal = document.getElementById('status-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.modalMessage = document.getElementById('modal-message');
    }

    bindEvents() {
        // Checkout button
        if (this.checkoutBtn) this.checkoutBtn.addEventListener('click', () => this.submitOrder());

        // Customer name input
        if (this.customerNameInput) this.customerNameInput.addEventListener('input', () => this.validateCheckout());

        // Custom tip input
        if (this.customTipInput) this.customTipInput.addEventListener('input', () => this.applyCustomTip());

        // Clear tip button
        if (this.clearTipBtn) this.clearTipBtn.addEventListener('click', () => this.clearTip());

        // Tip percentage buttons
        if (this.tipButtons && this.tipButtons.length) {
            this.tipButtons.forEach(btn => {
                if (!btn) return;
                btn.addEventListener('click', () => {
                    const percentage = parseFloat(btn.dataset.percent);
                    this.applyTipPercentage(percentage);
                });
            });
        }

        // Modal close events
        if (this.statusModal) {
            this.statusModal.addEventListener('click', (e) => {
                if (e.target === this.statusModal) {
                    this.closeModal();
                }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    async loadMenu() {
        try {
            this.showLoading(true);
            console.log('Loading menu from server...');
            
            const response = await fetch('/api/menu');
            if (!response.ok) {
                throw new Error(`Failed to fetch menu: ${response.status}`);
            }
            
            this.menuData = await response.json();
            console.log(`Loaded ${this.menuData.length} menu items`);
            
            // If server returned empty menu, fall back to demo menu
            if (!Array.isArray(this.menuData) || this.menuData.length === 0) {
                console.warn('Server returned empty menu — using demo fallback');
                this.menuData = DEV_MOCK_MENU.slice();
            }

            this.renderFilters();
            this.filterMenu('All');
            this.showLoading(false);
            
        } catch (error) {
            console.error('Failed to load menu:', error);
            // Use demo menu on error so UI remains usable
            this.menuData = DEV_MOCK_MENU.slice();
            this.renderFilters();
            this.filterMenu('All');
            this.showLoading(false);
            // Also log visible message in console; showError reserved for fatal UI-only failures
            console.warn('Using demo menu due to fetch error:', error.message || error);
        }
    }

    showLoading(show) {
        if (show) {
            if (this.loadingSpinner) this.loadingSpinner.classList.remove('hidden');
            if (this.menuContainer) this.menuContainer.classList.add('hidden');
            if (this.filterContainer) this.filterContainer.classList.add('hidden');
        } else {
            if (this.loadingSpinner) this.loadingSpinner.classList.add('hidden');
            if (this.menuContainer) this.menuContainer.classList.remove('hidden');
            if (this.filterContainer) this.filterContainer.classList.remove('hidden');
        }
    }

    showError(message) {
        if (this.loadingSpinner) {
            this.loadingSpinner.innerHTML = `
                <div class="text-center py-12">
                    <div class="text-red-600 text-xl mb-4">⚠️</div>
                    <p class="text-red-600 font-semibold">${message}</p>
                    <button onclick="location.reload()" class="btn btn-primary mt-4">
                        Try Again
                    </button>
                </div>
            `;
            this.loadingSpinner.classList.remove('hidden');
        } else {
            console.warn('ShowError: loadingSpinner element not found. Message:', message);
        }
    }

    renderFilters() {
        const categories = ['All', ...new Set(this.menuData.map(item => item.category || 'Uncategorized'))];
        
        this.filterContainer.innerHTML = categories.map(category => `
            <button 
                class="filter-btn px-4 py-2 rounded-full font-semibold text-sm transition-all duration-200 ${
                    category === this.activeCategory 
                        ? 'bg-red-600 text-white shadow-lg' 
                        : 'bg-gray-200 text-gray-700 hover:bg-red-100'
                }"
                data-category="${category}"
            >
                ${category}
            </button>
        `).join('');
        
        // Bind filter events
        this.filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.filterMenu(btn.dataset.category);
            });
        });
    }

    filterMenu(category) {
        this.activeCategory = category;
        
        let filteredItems = this.menuData;
        if (category !== 'All') {
            filteredItems = this.menuData.filter(item => 
                (item.category || 'Uncategorized') === category
            );
        }
        
        this.renderMenu(filteredItems);
        this.renderFilters(); // Update active state
    }

    renderMenu(items) {
        if (items.length === 0) {
            this.menuContainer.innerHTML = `
                <div class="text-center py-12">
                    <p class="text-gray-500 text-lg">
                        No items found in category: <span class="font-semibold text-red-600">${this.activeCategory}</span>
                    </p>
                </div>
            `;
            return;
        }
        
        const groupedItems = this.groupByCategory(items);
        
        this.menuContainer.innerHTML = Object.entries(groupedItems).map(([category, categoryItems]) => `
            <section class="mb-10 fade-in">
                <h2 class="text-3xl font-bold text-gray-700 mb-6 border-l-4 border-red-500 pl-4">
                    ${category}
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    ${categoryItems.map(item => this.renderMenuItem(item)).join('')}
                </div>
            </section>
        `).join('');
        
        // Bind add to cart events
        this.menuContainer.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const { id, name, price } = btn.dataset;
                this.addToCart(id, name, parseFloat(price));
            });
        });
    }

    groupByCategory(items) {
        return items.reduce((acc, item) => {
            const category = item.category || 'Uncategorized';
            if (!acc[category]) acc[category] = [];
            acc[category].push(item);
            return acc;
        }, {});
    }

    renderMenuItem(item) {
        return `
            <div class="card hover:shadow-lg transition-all duration-200">
                <div class="card-body">
                    <div class="flex items-start justify-between">
                        <div class="flex-grow">
                            <h3 class="text-lg font-semibold text-gray-800 mb-2">${item.name}</h3>
                            <p class="text-sm text-gray-600 mb-3">${item.description || 'Delicious and freshly prepared'}</p>
                            <p class="text-xl font-bold text-red-600">$${item.price.toFixed(2)}</p>
                        </div>
                        <button
                            class="add-to-cart-btn btn btn-primary ml-4 flex-shrink-0 p-3 rounded-full"
                            data-id="${item.id}"
                            data-name="${item.name}"
                            data-price="${item.price}"
                            title="Add to Cart"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    addToCart(id, name, price) {
        if (this.cart.has(id)) {
            const item = this.cart.get(id);
            item.quantity += 1;
        } else {
            this.cart.set(id, { id, name, price, quantity: 1 });
        }
        
        this.updateCart();
        this.showAddedToCartFeedback();
    }

    removeFromCart(id) {
        this.cart.delete(id);
        this.updateCart();
    }

    updateCartQuantity(id, delta) {
        if (this.cart.has(id)) {
            const item = this.cart.get(id);
            item.quantity += delta;
            
            if (item.quantity <= 0) {
                this.removeFromCart(id);
            } else {
                this.updateCart();
            }
        }
    }

    updateCart() {
        const cartItems = Array.from(this.cart.values());
        
        if (cartItems.length === 0) {
            this.emptyCartMessage.classList.remove('hidden');
            this.cartContainer.innerHTML = '';
        } else {
            this.emptyCartMessage.classList.add('hidden');
            this.cartContainer.innerHTML = cartItems.map(item => this.renderCartItem(item)).join('');
            
            // Bind cart item events
            this.cartContainer.querySelectorAll('.quantity-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const { id, delta } = btn.dataset;
                    this.updateCartQuantity(id, parseInt(delta));
                });
            });
        }
        
        this.calculateTotals();
        this.validateCheckout();
    }

    renderCartItem(item) {
        const itemTotal = item.price * item.quantity;
        
        return `
            <div class="card mb-3">
                <div class="card-body p-4">
                    <div class="flex items-center justify-between">
                        <div class="flex-grow">
                            <h4 class="font-medium text-gray-800">${item.name}</h4>
                            <p class="text-sm text-gray-500">$${item.price.toFixed(2)} × ${item.quantity}</p>
                            <p class="text-sm font-semibold text-gray-700">$${itemTotal.toFixed(2)}</p>
                        </div>
                        <div class="flex items-center space-x-2 ml-4">
                            <button 
                                class="quantity-btn btn btn-secondary p-2"
                                data-id="${item.id}" 
                                data-delta="-1"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
                                </svg>
                            </button>
                            <span class="font-bold text-lg w-8 text-center">${item.quantity}</span>
                            <button 
                                class="quantity-btn btn btn-secondary p-2"
                                data-id="${item.id}" 
                                data-delta="1"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    calculateTotals() {
        this.subTotal = Array.from(this.cart.values())
            .reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        this.total = this.subTotal + this.tipAmount;
        
        if (this.subTotalDisplay) {
            this.subTotalDisplay.textContent = `$${this.subTotal.toFixed(2)}`;
        }
        this.tipDisplay.textContent = `$${this.tipAmount.toFixed(2)}`;
        this.cartTotalDisplay.textContent = `$${this.total.toFixed(2)}`;
    }

    applyTipPercentage(percentage) {
        this.tipAmount = parseFloat((this.subTotal * percentage).toFixed(2));
        this.customTipInput.value = '';
        this.calculateTotals();
        this.updateTipButtonState(percentage);
    }

    applyCustomTip() {
        const customValue = parseFloat(this.customTipInput.value);
        if (!isNaN(customValue) && customValue >= 0) {
            this.tipAmount = parseFloat(customValue.toFixed(2));
        } else {
            this.tipAmount = 0;
        }
        this.calculateTotals();
        this.updateTipButtonState(null);
    }

    clearTip() {
        this.tipAmount = 0;
        this.customTipInput.value = '';
        this.calculateTotals();
        this.updateTipButtonState(null);
    }

    updateTipButtonState(activePercent) {
        this.tipButtons.forEach(btn => {
            const percent = parseFloat(btn.dataset.percent);
            if (percent === activePercent) {
                btn.classList.add('bg-red-600', 'text-white');
                btn.classList.remove('bg-gray-200', 'text-gray-700');
            } else {
                btn.classList.remove('bg-red-600', 'text-white');
                btn.classList.add('bg-gray-200', 'text-gray-700');
            }
        });
        
        this.clearTipBtn.classList.toggle('hidden', this.tipAmount === 0);
    }

    validateCheckout() {
        const hasItems = this.cart.size > 0;
        const hasName = this.customerNameInput.value.trim().length > 0;
        this.checkoutBtn.disabled = !hasItems || !hasName || this.isLoading;
    }

    async submitOrder() {
        if (this.isLoading) return;
        
        const customerName = this.customerNameInput.value.trim();
        
        if (!customerName) {
            this.showModal('Error', 'Please enter your name before placing the order.', 'text-error');
            return;
        }
        
        if (this.cart.size === 0) {
            this.showModal('Error', 'Your cart is empty! Please add items to order.', 'text-error');
            return;
        }
        
        this.setLoadingState(true);
        
        try {
            const orderDetails = Array.from(this.cart.values()).map(item => ({
                item_id: item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price
            }));
            
            const orderPayload = {
                customer_name: customerName,
                sub_total: this.subTotal,
                tip_amount: this.tipAmount,
                total_amount: this.total,
                order_details: orderDetails
            };
            
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderPayload)
            });
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || `Server error: ${response.status}`);
            }
            
            const data = await response.json();
            
            this.showModal(
                'Order Placed Successfully! 🎉', 
                `Thank you ${customerName}! Your order #${data.order_id} has been placed and will be prepared shortly.`,
                'text-success'
            );
            
            this.resetOrder();
            
        } catch (error) {
            console.error('Order submission failed:', error);
            this.showModal(
                'Order Failed', 
                `Sorry, we couldn't process your order. ${error.message}. Please try again.`,
                'text-error'
            );
        } finally {
            this.setLoadingState(false);
        }
    }

    setLoadingState(loading) {
        this.isLoading = loading;
        this.checkoutBtn.disabled = loading;
        
        if (loading) {
            this.checkoutText.classList.add('hidden');
            this.checkoutLoading.classList.remove('hidden');
        } else {
            this.checkoutText.classList.remove('hidden');
            this.checkoutLoading.classList.add('hidden');
        }
        
        this.validateCheckout();
    }

    resetOrder() {
        this.cart.clear();
        this.subTotal = 0;
        this.tipAmount = 0;
        this.total = 0;
        this.customerNameInput.value = '';
        this.customTipInput.value = '';
        this.updateCart();
        this.updateTipButtonState(null);
    }

    showAddedToCartFeedback() {
        // Simple visual feedback for adding items
        const cartIcon = document.querySelector('.cart-icon');
        if (cartIcon) {
            cartIcon.classList.add('pulse');
            setTimeout(() => cartIcon.classList.remove('pulse'), 600);
        }
    }

    showModal(title, message, titleClass = '') {
        this.modalTitle.textContent = title;
        this.modalTitle.className = `text-2xl font-bold mb-4 ${titleClass}`;
        this.modalMessage.textContent = message;
        this.statusModal.classList.remove('hidden');
        
        // Focus management for accessibility
        this.statusModal.focus();
    }

    closeModal() {
        this.statusModal.classList.add('hidden');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('F&B Order Kiosk initializing...');
    window.kiosk = new OrderKiosk();
});

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OrderKiosk;
}