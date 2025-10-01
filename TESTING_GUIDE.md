# MOSÉ Platform - Complete User Registration Flow Testing Guide

This guide covers testing all three user roles (Admin, Seller, Buyer) and the complete user management workflow implemented in the MOSÉ African art marketplace platform.

## Prerequisites

Before testing, ensure you have:

1. ✅ **Database Setup**: Collections created and configured
2. ✅ **Environment Variables**: `.env.local` properly configured
3. ✅ **Admin User**: Initial admin seeded
4. ✅ **Development Server**: Running on port 3000 or 3002

## Setup Instructions

### 1. Database Collections Setup

```bash
# Run these scripts in order:
npm run setup:collections  # Creates basic collections
npm run setup:profiles    # Creates user_profiles collection with adminLevel attribute
```

### 2. Seed Initial Admin

```bash
# Create the first admin user
npm run seed:admin
```

Default admin credentials (change in production):
- Email: `admin@mose.com`
- Password: `admin123456`
- Role: Super Admin

### 3. Start Development Server

```bash
npm run dev
```

---

## Testing Scenarios

### Scenario 1: Admin User Flow

**Objective**: Test admin registration, login, and user management capabilities.

#### 1.1 Admin Registration (Optional - usually seeded)
1. Navigate to `/register?role=admin`
2. Fill registration form:
   - Name: "Test Admin"
   - Email: "testadmin@mose.com" 
   - Password: "testadmin123"
   - Role: Select "Admin" (👑 icon)
   - Agree to terms: ✅
3. Click "Create Account"
4. **Expected**: Redirect to `/admin` dashboard
5. **Verify**: User profile shows admin role and verified status

#### 1.2 Admin Login
1. Navigate to `/login`
2. Login with seeded admin credentials:
   - Email: `admin@mose.com`
   - Password: `admin123456`
3. **Expected**: Redirect to admin dashboard
4. **Verify**: Navigation shows admin-specific menu items

#### 1.3 Admin User Management
1. Navigate to `/admin/users` (if component exists)
2. **Expected**: See user approval panel with:
   - Platform statistics (total users, verified, pending)
   - Tab navigation (Pending Approval / All Users)
   - User cards with action buttons

#### 1.4 Admin Seller Approval Workflow
1. Create a test seller (see Scenario 2)
2. Login as admin
3. View pending approvals
4. Test approval actions:
   - ✅ **Approve**: Click approve on seller
   - ❌ **Reject**: Click reject with reason
   - ⏸️ **Suspend**: Click suspend with reason
   - ▶️ **Reactivate**: Click reactivate on suspended user
5. **Verify**: Notifications sent to affected users

---

### Scenario 2: Seller User Flow

**Objective**: Test seller registration, approval process, and seller-specific features.

#### 2.1 Seller Registration
1. Navigate to `/register?role=seller`
2. Fill registration form:
   - Name: "Test Artist"
   - Email: "artist@mose.com"
   - Password: "artist123456"
   - Role: Select "Sell Art" (🎨 icon)
   - Agree to terms: ✅
3. Click "Create Account"
4. **Expected**: Redirect to `/seller` dashboard
5. **Verify**: 
   - User profile created with `userType: 'seller'`
   - `isVerified: false` (pending approval)
   - Approval status component visible

#### 2.2 Seller Approval Status
1. After registration, verify approval status component shows:
   - ⏳ "Account Under Review" message
   - Yellow styling (pending status)
   - Next steps for sellers
   - Refresh status button
2. **Expected**: Clear guidance on approval process

#### 2.3 Seller Approval Process
1. Login as admin (`admin@mose.com`)
2. Navigate to user management
3. Find the test seller in "Pending Approval" tab
4. **Approve the seller**:
   - Click "Approve" button
   - **Expected**: 
     - Seller `isVerified` becomes `true`
     - Notification sent to seller
     - Seller moves to "All Users" tab

#### 2.4 Post-Approval Seller Experience
1. Login as approved seller
2. **Verify**:
   - ✅ "Account Approved" status message (green)
   - Access to seller-specific navigation items
   - Can access seller dashboard and tools
   - Role-based navigation shows seller sections

#### 2.5 Seller Rejection Flow
1. Create another test seller
2. Login as admin and **reject** the seller with reason
3. Login as rejected seller
4. **Verify**:
   - ❌ "Account Rejected" message (red)
   - Contact support button visible
   - Limited access to platform features

#### 2.6 Seller Suspension Flow
1. Login as admin
2. **Suspend** an approved seller
3. Login as suspended seller
4. **Verify**:
   - ⚠️ "Account Suspended" message (red)
   - Limited access to seller features
   - Contact support options

---

### Scenario 3: Buyer User Flow

**Objective**: Test buyer registration and buyer-specific features.

#### 3.1 Buyer Registration
1. Navigate to `/register` (default) or `/register?role=buyer`
2. Fill registration form:
   - Name: "Test Buyer"
   - Email: "buyer@mose.com"
   - Password: "buyer123456"
   - Role: Select "Buy Art" (🛍️ icon) - should be pre-selected
   - Agree to terms: ✅
3. Click "Create Account"
4. **Expected**: Redirect to `/buyer` dashboard
5. **Verify**:
   - User profile created with `userType: 'buyer'`
   - No approval process required (buyers auto-approved)
   - `isVerified: true` immediately

#### 3.2 Buyer Experience
1. After registration/login as buyer
2. **Verify**:
   - Access to buyer-specific navigation
   - Can browse products, view orders, manage wishlist
   - Role-based navigation shows buyer sections
   - No seller or admin features visible

---

### Scenario 4: Role-Based Navigation Testing

**Objective**: Verify navigation adapts correctly to user roles.

#### 4.1 Navigation for Each Role

**Admin Navigation Should Include**:
- ⚙️ Admin Dashboard
- 👥 User Management  
- 🛡️ Content Moderation
- 📊 Platform Analytics
- 🔧 System Settings
- 💬 Messages
- 🔔 Notifications
- ⚙️ Settings
- 🚪 Sign Out

**Seller Navigation Should Include**:
- 🎨 Browse Art (common)
- 📊 Dashboard (seller)
- 🖼️ My Products 
- 📋 Orders (seller)
- 📈 Analytics (seller)
- 👤 Profile (seller)
- 💬 Messages
- 🔔 Notifications
- ⚙️ Settings
- 🚪 Sign Out

**Buyer Navigation Should Include**:
- 🎨 Browse Art
- 📦 My Orders (buyer)
- 💝 Wishlist
- 🎁 Gift Events
- 💬 Messages
- 🔔 Notifications
- ⚙️ Settings
- 🚪 Sign Out

#### 4.2 Role Access Control
Test that users cannot access unauthorized routes:

1. **Buyer trying to access seller routes**:
   - Navigate to `/seller/dashboard` as buyer
   - **Expected**: Redirect to `/buyer`

2. **Seller trying to access admin routes**:
   - Navigate to `/admin/users` as seller
   - **Expected**: Redirect to `/seller`

3. **Unverified seller accessing protected routes**:
   - Login as unverified seller
   - Navigate to `/seller/products`
   - **Expected**: Redirect to verification pending page

---

### Scenario 5: Authentication Flow Testing

#### 5.1 Login Flow
1. Test login for each role type:
   - Admin: Redirects to `/admin`
   - Seller: Redirects to `/seller` 
   - Buyer: Redirects to `/buyer`

#### 5.2 Authentication Guards
1. **Unauthenticated access**:
   - Navigate to `/seller/dashboard` without login
   - **Expected**: Redirect to `/login`

2. **Session persistence**:
   - Login, close browser, reopen
   - **Expected**: Still authenticated and redirected to role dashboard

#### 5.3 Logout Flow
1. Click "Sign Out" from navigation
2. **Expected**: 
   - Session cleared
   - Redirect to home page or login
   - Cannot access protected routes

---

### Scenario 6: Notification System Testing

#### 6.1 Seller Approval Notifications
1. Admin approves seller
2. **Verify**: 
   - Notification created in database
   - Seller sees notification (if notification UI exists)
   - Notification content matches approval message

#### 6.2 Seller Rejection Notifications  
1. Admin rejects seller with reason
2. **Verify**:
   - Rejection notification created
   - Contains rejection reason
   - Appropriate action buttons (Contact Support)

#### 6.3 Suspension Notifications
1. Admin suspends user
2. **Verify**:
   - Suspension notification created
   - Contains suspension reason
   - User informed of suspension

---

## Expected Database State After Testing

After completing all test scenarios, your database should contain:

### Users Collection (Built-in Appwrite)
- 1 Admin user (seeded)
- 1-2 Test admin users (if registered)
- 2-3 Seller users (approved, rejected, suspended)
- 1+ Buyer users

### user_profiles Collection  
- Profiles for all created users
- Proper `userType` assignment
- Correct `isVerified` status
- Admin users with `adminLevel`

### notifications Collection
- Approval notifications for sellers
- Rejection notifications with reasons  
- Suspension/reactivation notifications

---

## Troubleshooting

### Common Issues and Solutions

#### 1. "Collection not found" Error
- **Cause**: Collections not created
- **Solution**: Run `npm run setup:collections` and `npm run setup:profiles`

#### 2. Registration fails with database error
- **Cause**: Missing attributes in user_profiles collection
- **Solution**: Re-run `npm run setup:profiles` to add missing attributes

#### 3. Admin seeding fails
- **Cause**: Collection not ready or permissions issue
- **Solution**: 
  - Verify collections exist in Appwrite console
  - Check API key permissions
  - Ensure correct environment variables

#### 4. Role navigation not working
- **Cause**: Auth store not properly updating user profile
- **Solution**: Check browser console for auth errors, verify UserService integration

#### 5. Notifications not being created
- **Cause**: Notifications collection not created
- **Solution**: Add notifications collection to setup script or create manually

---

## Success Criteria

✅ **User Registration**: All three roles can register successfully
✅ **Role Assignment**: Proper role assignment in database and UI  
✅ **Approval Workflow**: Sellers require and receive approval
✅ **Navigation**: Role-appropriate navigation displayed
✅ **Access Control**: Users can only access authorized routes
✅ **Notifications**: Proper notifications sent for approval actions
✅ **Authentication**: Login/logout works correctly
✅ **Database Integrity**: All user data properly stored and linked

---

## Next Steps After Testing

1. **Create Admin Dashboard Pages**: Build actual admin interface pages
2. **Implement Seller Dashboard**: Create seller-specific pages and tools
3. **Build Buyer Interface**: Implement buyer dashboard and shopping features
4. **Add Notification UI**: Create notification center for users
5. **Implement Real-time Updates**: Add real-time notifications for approvals
6. **Add Email Notifications**: Send email alerts for important actions
7. **Create Support System**: Build contact/support functionality
8. **Add Verification Documents**: Allow sellers to upload verification files

---

This comprehensive testing ensures the complete user role management system is working correctly and provides a solid foundation for building the rest of the MOSÉ platform features.