Product Requirements Document (PRD) for MOSÉ
Document Owner: Klinton Ehigiator
Date: 22nd June, 2025
Version: 1.0
1. Overview
1.1 Purpose
The Artwork & Gifts Marketplace (MOSÉ) is an e-commerce platform that connects artists,
crafters, and independent creators with buyers looking for unique, handmade, and
personalized artworks. It also help users to create a gift platform so as to get gifts on their
birthdays from friends. The platform will enable sellers to showcase and sell their
products while providing buyers with a seamless shopping experience.
1.2 Goals & Objectives
• Provide a user-friendly marketplace for artists and creators to sell their work.
• Offer buyers a curated selection of unique, high-quality artwork and gifts.
• Support secure transactions and multiple payment options.
• Implement a review and rating system to build trust.
• Enable customization/personalization options for certain products.
• Provide collected historic events centered around African and other contemporary
artworks and artists
• Enable users to create gift platform to obtain gifts on birthdays
1.3 Target Audience
Sellers: Independent artists, crafters, designers, and small businesses.
Buyers: Consumers looking for unique gifts, art collectors, interior decorators, and
corporate buyers.
2. Features & Functionality
2.1 User Roles
1. Guest Users
- Browse products
- View historic art articles
- Search & filter listings
- View seller profiles
- No checkout (must register)
2. Buyers (Registered Users)
- Create an account
- Add items to cart
- Checkout & make payments
- Leave reviews & ratings
- Save favorites/wishlist
- Track orders
3. Sellers (Registered Users)
- Create & manage a seller profile
- List products (images, descriptions, pricing)
- Manage inventory
- Process orders & shipping
- Communicate with buyers
- Access sales analytics
4. Admin
- Approve/reject seller applications
- Moderate listings & reviews
- Handle disputes & refunds
- Manage promotions & discounts
- View platform analytics
5. Guest User( Gift Event Platform)
- Gift event wishlist creation with marketplace products for any occasion (birthday, wedding, graduation, etc.)
- Friends/family can purchase items directly from the wishlist
- Orders delivered to event creator's address
- Optional bank account for monetary gifts
- Digital card with messages, photos, and Spotify playlist integration
2.2 Core Features
A. Product Listings & Discovery
Search & Filters:
- Categories (e.g., paintings, jewelry, home decor, personalized gifts)
- Price range, ratings, location (local/global sellers)
- Customization options (engraving, colors, sizes)
Product Pages:
- High-quality images (zoom functionality)
- Detailed descriptions & materials used
- Seller profile & ratings
- Reviews & Q&A section
B. Shopping & Checkout
Cart System:
- Add multiple items
- Apply promo codes
- Save for later
Checkout Process:
- Multiple payment options (Credit Card, PayPal, paystack transfer etc)
- Shipping calculator
- Order summary & confirmation
C. Seller Dashboard
- Product Management:
- Seller Rating
- Add/edit/delete listings
- Set pricing & variations
- Track inventory
Order Management:
- View & process orders
- Print shipping labels
- Update order status
- Earnings & Analytics:
- Sales reports
- Payout history (integrations like paystack)
D. User Engagement & Trust
- Reviews & Ratings:
- Buyers can rate products & sellers
- Seller response feature
- Messaging System:
- Secure in-platform communication
- Promotions & Discounts:
- Seasonal sales
- Seller-generated coupon codes
E. Customization & Personalization
- Option for buyers to request custom artwork/gifts
- Text personalization (e.g., engraved names, dates)
- Preview tool for customized products
- Gift event wishlist platform for any occasion (birthday, wedding, anniversary, graduation, etc.)
- Product wishlist selection from marketplace
- Direct purchase by contributors with delivery to event creator
3. Technical Requirements
3.1 Platform & Hosting
- Frontend: React.js / Next.js (responsive design)
- Backend: Node.js / Django
- Database: PostgreSQL / MongoDB
- Hosting: AWS / Vercel / Heroku
3.2 Integrations
- Payments: Paystack, PayPal
- Shipping: ShipStation, EasyPost
- Authentication: Firebase Auth / OAuth (Google, Facebook)
- Analytics: Google Analytics, Mixpanel
3.3 Security & Compliance
- SSL encryption
- GDPR/CCPA compliance (data privacy)
- Fraud detection for transactions
4. Non-Functional Requirements
4.1 Performance
- Page load time < 3 seconds
- Handle 10,000+ concurrent users
4.2 Scalability
- Cloud-based infrastructure for scaling
- CDN for image optimization
4.3 Accessibility
- WCAG 2.1 compliance (screen reader support, alt text)
---
5. Success Metrics (KPIs)
- Monthly Active Users (MAU)
- Conversion Rate (visitors to buyers)
- Average Order Value (AOV)
- Seller Retention Rate
- Customer Satisfaction (CSAT & NPS)
6. Timeline & Milestones
| Phase | Duration | Deliverables |
|--------|------------|--------------|
| Discovery & Planning | * Weeks | PRD, Wireframes |
| MVP Development | * weeks | Core features (listings, checkout, seller dashboard) |
| Beta Testing | * weeks | User feedback & bug fixes |
| Full Launch | * weeks | Marketing & onboarding |
7. Open Questions & Assumptions
- Will there be a subscription model for sellers?
- How will disputes & refunds be handled?
- Should there be a mobile app in the future?
Approval
Approved by:
Date:
This PRD outlines the key requirements for the Artwork & Gifts Marketplace(MOSÉ).
Feedback and revisions are welcome before development begins.
Next Steps:
- Finalize wireframes & UI/UX design
- Begin MVP development
- Conduct user testing