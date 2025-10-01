# 🚀 Getting Started with MOSÉ Platform

Welcome to your fully integrated MOSÉ platform with MCP-Appwrite integration! This guide will help you set up and launch your African art marketplace with collaborative gift features.

## 📋 Prerequisites Checklist

Before you begin, ensure you have:

- [ ] **Node.js 18+** installed
- [ ] **Appwrite account** at [cloud.appwrite.io](https://cloud.appwrite.io)
- [ ] **Paystack account** for payments (Nigerian business)
- [ ] **Spotify Developer account** for music features
- [ ] **Git** for version control

## ⚡ Quick Start (5 Minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
Copy and update your environment configuration:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual credentials:
```env
# Appwrite (Required)
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key-with-full-permissions
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1

# Paystack (Required for payments)
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your-public-key
PAYSTACK_SECRET_KEY=sk_test_your-secret-key

# Spotify (Required for gift platform)
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
```

### 3. Create Database Collections
Run the automated setup:
```bash
npm run setup:collections
```

### 4. Start Development
```bash
npm run dev
```

Your platform will be available at `http://localhost:3000` 🎉

## 🔧 Detailed Setup Guide

### Step 1: Appwrite Configuration

1. **Create Appwrite Project**:
   - Go to [Appwrite Console](https://cloud.appwrite.io)
   - Create a new project
   - Copy your Project ID

2. **Generate API Key**:
   - Go to Settings > API Keys
   - Create a new API key with these scopes:
     ```
     ✅ databases.read    ✅ databases.write
     ✅ collections.read  ✅ collections.write
     ✅ attributes.read   ✅ attributes.write
     ✅ indexes.read      ✅ indexes.write
     ✅ documents.read    ✅ documents.write
     ✅ buckets.read      ✅ buckets.write
     ✅ files.read        ✅ files.write
     ✅ users.read        ✅ users.write
     ```

3. **Platform Settings**:
   - Add your domain: `http://localhost:3000` (development)
   - Add your production domain when ready

### Step 2: Paystack Configuration

1. **Create Paystack Account**:
   - Sign up at [paystack.com](https://paystack.com)
   - Verify your Nigerian business

2. **Get API Keys**:
   - Dashboard > Settings > API Keys & Webhooks
   - Copy your **Public Key** and **Secret Key**
   - Use test keys for development

3. **Set Webhook URL**:
   ```
   Development: https://your-ngrok-url.ngrok.io/api/webhooks/paystack
   Production: https://yourdomain.com/api/webhooks/paystack
   ```

### Step 3: Spotify Configuration

1. **Create Spotify App**:
   - Go to [Spotify Developer Console](https://developer.spotify.com/dashboard)
   - Create a new app
   - Add redirect URI: `http://localhost:3000/auth/spotify/callback`

2. **Copy Credentials**:
   - Client ID and Client Secret from your app dashboard

### Step 4: Test MCP Integration

Verify your MCP setup is working:
```bash
# Test basic connectivity
npm run mcp:test

# List collections (should show your collections)
npm run mcp:collections

# List storage buckets
npm run mcp:buckets
```

## 🎯 Core Features Overview

### **Marketplace Features**
- **Product Management**: Create, edit, and manage art listings
- **Search & Filters**: Find art by category, price, location
- **Shopping Cart**: Multi-item purchases with calculations
- **Order Tracking**: Real-time order status updates
- **Reviews & Ratings**: Community feedback system

### **Gift Platform Features** 🎁
- **Collaborative Gifts**: Friends contribute together
- **Digital Cards**: Custom greeting cards with messages
- **Spotify Integration**: Collaborative playlists for celebrations
- **Event Management**: Birthday and celebration planning
- **Social Sharing**: Invite friends to contribute

### **Communication System**
- **Real-time Chat**: Buyer-seller messaging
- **File Sharing**: Send images and documents
- **Typing Indicators**: Live chat feedback
- **Message History**: Persistent conversations

## 🛠️ Development Workflow

### Using MCP for Development
Your platform includes Model Context Protocol integration for accelerated development:

```bash
# Create collections instantly
uvx mcp-server-appwrite --databases create-collection --name products

# Test with real data
uvx mcp-server-appwrite --databases create-document --collection-id products --data '{...}'

# Upload files directly
uvx mcp-server-appwrite --storage create-file --bucket-id product-images --file image.jpg
```

### Service Layer Usage
Import and use services in your components:

```typescript
import { 
  ProductService, 
  OrderService, 
  GiftService, 
  MessagingService,
  SpotifyService,
  PaystackService 
} from '@/lib/services';

// Create a product
const product = await ProductService.createProduct(productData);

// Process payment
const payment = await PaystackService.initializePayment(paymentData);

// Create gift event
const giftEvent = await GiftService.createGiftEvent(eventData);
```

### Real-time Features
Enable live updates in your components:

```typescript
import { RealtimeService } from '@/lib/services';

// Subscribe to order updates
const unsubscribe = RealtimeService.subscribeToOrderUpdates(
  userId,
  (order) => console.log('Order updated:', order)
);

// Subscribe to gift contributions
RealtimeService.subscribeToGiftEventUpdates(
  eventId,
  (event) => console.log('Gift updated:', event),
  (contribution) => console.log('New contribution:', contribution)
);
```

## 📊 Testing Your Setup

### 1. Test Database Operations
```bash
# List all collections
npm run mcp:collections

# Should show: products, orders, gift_events, conversations, etc.
```

### 2. Test File Upload
```bash
# List storage buckets
npm run mcp:buckets

# Should show: product-images, gift-images, user-avatars, etc.
```

### 3. Test Payment Integration
- Use Paystack test cards for development
- Test card: `4084084084084081` (successful)
- Test card: `4084084084084081` (failed)

### 4. Test Spotify Integration
- Use your Spotify account for testing
- Create test playlists and search for tracks

## 🚀 Going Live

### Pre-Launch Checklist
- [ ] **Update environment variables** for production
- [ ] **Configure production Appwrite** project
- [ ] **Set up production Paystack** account
- [ ] **Configure domain** and SSL certificates
- [ ] **Test all payment flows** with real money (small amounts)
- [ ] **Test email notifications**
- [ ] **Set up error monitoring** (Sentry)
- [ ] **Configure analytics** (Google Analytics)

### Production Deployment
1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Deploy to your hosting provider** (Vercel, Netlify, etc.)

3. **Update webhook URLs** in Paystack dashboard

4. **Test all functionality** in production environment

## 🆘 Troubleshooting

### Common Issues

**1. "MCP server not found"**
- Ensure `uv` is installed: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- Add to PATH: `export PATH="$HOME/.local/bin:$PATH"`

**2. "Appwrite connection failed"**
- Check your Project ID and API Key
- Ensure API key has all required permissions
- Verify Appwrite endpoint URL

**3. "Collections not created"**
- Run setup again: `npm run setup:collections`
- Check Appwrite console for error messages
- Verify database permissions

**4. "Payment failed"**
- Use Paystack test credentials for development
- Check webhook URL configuration
- Verify Nigerian business account for live payments

**5. "Spotify authentication failed"**
- Check redirect URI matches exactly
- Verify Client ID and Secret
- Ensure Spotify app is not in development mode

### Getting Help

1. **Check Implementation Guide**: `MCP_SETUP_GUIDE.md`
2. **Review Service Documentation**: `IMPLEMENTATION_SUMMARY.md`
3. **MCP Commands**: Use `uvx mcp-server-appwrite --help`
4. **Appwrite Console**: Check logs and errors
5. **Paystack Dashboard**: Monitor payment transactions

## 🎊 You're Ready!

Congratulations! You now have a fully functional African art marketplace with:

- ✅ **Complete MCP-Appwrite integration**
- ✅ **Real-time features** across all modules
- ✅ **Payment processing** with Paystack
- ✅ **Music integration** with Spotify
- ✅ **Collaborative gift platform**
- ✅ **Professional codebase** ready for scale

**Start building your community of African artists and gift-givers today! 🎨🎁**

---

*For detailed technical documentation, see `IMPLEMENTATION_SUMMARY.md`*  
*For MCP setup details, see `MCP_SETUP_GUIDE.md`*