# F&B Order Kiosk - Enhanced Version

A modern, responsive food and beverage ordering kiosk built with Express.js and Supabase.

## 🚀 Features

### ✨ Enhanced UI/UX
- **Modern Design**: Clean, responsive interface with Tailwind CSS
- **Mobile-First**: Optimized for tablets and mobile devices
- **Accessibility**: WCAG compliant with proper ARIA labels
- **Real-time Updates**: Live cart updates and order status
- **Loading States**: Smooth loading animations and feedback

### 🔧 Technical Improvements
- **Enhanced Security**: Helmet.js, CORS, rate limiting
- **Input Validation**: Server-side validation with sanitization
- **Error Handling**: Comprehensive error handling and logging
- **Performance**: Optimized API calls and caching
- **Code Organization**: Modular, maintainable code structure

### 🍽️ Ordering Features
- **Menu Categories**: Dynamic filtering by food categories
- **Smart Cart**: Add/remove items with quantity controls
- **Flexible Tipping**: Percentage buttons or custom amounts
- **Order Validation**: Real-time form validation
- **Order Tracking**: Unique order IDs and status updates

## 📋 Prerequisites

- Node.js 16+ 
- Supabase account and project
- npm or pnpm package manager

## 🛠️ Installation

1. **Install Dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

2. **Environment Setup**
   
   Update your `.env` file with your Supabase credentials:
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   PORT=3000
   NODE_ENV=development
   ```

3. **Database Setup**
   
   Create these tables in your Supabase database:

   ```sql
   -- Menu Items Table
   CREATE TABLE menu_items (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     name VARCHAR(100) NOT NULL,
     description TEXT,
     price DECIMAL(10,2) NOT NULL,
     category VARCHAR(50),
     available BOOLEAN DEFAULT true,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Orders Table
   CREATE TABLE orders (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     customer_name VARCHAR(100) NOT NULL,
     sub_total DECIMAL(10,2) NOT NULL,
     tip_amount DECIMAL(10,2) DEFAULT 0,
     total_amount DECIMAL(10,2) NOT NULL,
     order_details JSONB NOT NULL,
     order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     status VARCHAR(20) DEFAULT 'pending'
   );

   -- Enable Row Level Security
   ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
   ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

   -- Create policies for public read access to menu
   CREATE POLICY "Allow public read access to menu_items" 
   ON menu_items FOR SELECT 
   USING (available = true);

   -- Create policies for order insertion
   CREATE POLICY "Allow public insert to orders" 
   ON orders FOR INSERT 
   WITH CHECK (true);
   ```

4. **Sample Data**
   
   Insert sample menu items:
   ```sql
   INSERT INTO menu_items (name, description, price, category) VALUES
   ('Espresso', 'Rich and bold coffee shot', 2.50, 'Coffee'),
   ('Cappuccino', 'Espresso with steamed milk foam', 4.00, 'Coffee'),
   ('Latte', 'Smooth espresso with steamed milk', 4.50, 'Coffee'),
   ('Croissant', 'Buttery, flaky pastry', 3.00, 'Pastries'),
   ('Blueberry Muffin', 'Fresh baked with real blueberries', 3.50, 'Pastries'),
   ('Caesar Salad', 'Crisp romaine with parmesan', 8.50, 'Salads'),
   ('Grilled Sandwich', 'Toasted with premium ingredients', 7.00, 'Sandwiches');
   ```

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
# or
pnpm run dev
```

### Production Mode
```bash
npm start
# or
pnpm start
```

The application will be available at `http://localhost:3000`

## 📡 API Endpoints

### Menu Management
- `GET /api/menu` - Fetch all available menu items
- `GET /api/health` - Health check endpoint

### Order Management
- `POST /api/orders` - Submit a new order
- `GET /api/orders` - Fetch orders (with optional status filter)
- `PATCH /api/orders/:id` - Update order status

### Example API Usage

**Submit Order:**
```javascript
const order = {
  customer_name: "John Doe",
  sub_total: 12.50,
  tip_amount: 2.50,
  total_amount: 15.00,
  order_details: [
    {
      item_id: "uuid-here",
      name: "Cappuccino",
      quantity: 2,
      price: 4.00
    }
  ]
};

fetch('/api/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(order)
});
```

## 🔒 Security Features

- **Helmet.js**: Security headers and XSS protection
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: API endpoint protection
- **Input Sanitization**: XSS prevention with validator.js
- **Environment Variables**: Secure credential management

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🐛 Troubleshooting

### Common Issues

1. **Menu not loading**
   - Check Supabase credentials in `.env`
   - Verify RLS policies allow public read access
   - Check browser console for network errors

2. **Orders not submitting**
   - Verify RLS policies allow order insertion
   - Check server logs for validation errors
   - Ensure all required fields are provided

3. **Database connection issues**
   - Verify Supabase project is active
   - Check API keys are correct
   - Test connection with Supabase dashboard

### Debug Mode
Set `NODE_ENV=development` for detailed error messages.

## 📈 Performance Optimization

- **Lazy Loading**: Menu items loaded on demand
- **Debounced Inputs**: Reduced API calls
- **Efficient Rendering**: Minimal DOM updates
- **Caching**: Static asset caching
- **Compression**: Gzip compression enabled

## 🔄 Deployment

### Vercel/Netlify
1. Connect your repository
2. Set environment variables
3. Deploy with build command: `npm run build`

### Docker
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- Check the troubleshooting section
- Review server logs
- Create an issue in the repository

---

**Built with ❤️ using Express.js, Supabase, and modern web technologies**