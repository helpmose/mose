# Image Upload Troubleshooting Guide

This guide helps you diagnose and fix image upload issues in the Mosé platform.

## 🔥 **MOST COMMON ISSUE: "File extension not allowed"**

**Error:** `File extension not allowed` or `POST https://cloud.appwrite.io/v1/storage/buckets/product-images/files 400 (Bad Request)`

**IMMEDIATE FIX:**
1. Go to **Appwrite Console** → **Storage** → **product-images** bucket
2. Click **Settings** tab  
3. In **"Allowed File Extensions"** field, add: `png,jpg,jpeg,webp,gif`
4. Click **Update**

If bucket doesn't exist, create it with:
- **Bucket ID**: `product-images`
- **Max File Size**: `5242880` (5MB)  
- **Allowed Extensions**: `png,jpg,jpeg,webp,gif`
- **Permissions**: `create("users")` and `read("any")`

---

## Quick Diagnosis

Run the storage verification script to automatically check your configuration:

```bash
npm run verify:storage
```

This script will:
- ✅ Check environment variables
- ✅ Verify storage bucket exists and is configured properly
- ✅ Test actual file uploads
- ✅ Provide specific fix instructions

## Common Issues & Solutions

### 1. **Images Upload But Don't Save to Products**

**Symptoms:**
- Product creation form accepts images
- Images show in preview
- Product gets created but without images
- No error messages shown to user

**Most Likely Cause:** Storage bucket permissions

**Solution:**
1. Run `npm run verify:storage`
2. Go to Appwrite Console → Storage → product-images bucket
3. Add these permissions:
   - `create("users")` - Allow authenticated users to upload
   - `read("any")` - Allow anyone to view images

### 2. **Upload Fails With Permission Errors**

**Console Error:** `Storage access denied` or `401 Unauthorized`

**Solution:**
- Check bucket permissions (see #1 above)
- Verify user is authenticated
- Check if bucket has `create` permissions

### 3. **Bucket Not Found Errors**

**Console Error:** `Storage bucket not found` or `404 Not Found`

**Solution:**
1. Create the storage bucket in Appwrite Console:
   - Bucket ID: `product-images`
   - Max file size: 5MB
   - Allowed extensions: `jpg,jpeg,png,webp,gif`

### 4. **Large File Upload Failures**

**Error:** `File too large` or `413 Payload Too Large`

**Solutions:**
- Reduce image file size (max 5MB)
- Compress images before upload
- Check bucket max file size settings

### 5. **Unsupported File Format**

**Error:** Images rejected during upload

**Solution:**
- Use supported formats: JPEG, PNG, WebP, GIF
- Check file extensions match MIME types

## Environment Variables

Ensure these are set in your `.env.local`:

```env
# Client-side (public)
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id

# Server-side (private)
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
```

## Testing Image Uploads

1. **Frontend Testing:**
   - Go to `/seller/products/new`
   - Try uploading various image types
   - Check browser console for errors
   - Look for detailed error messages in the form

2. **Backend Testing:**
   - Run `npm run verify:storage`
   - Check server logs during product creation
   - Verify files appear in Appwrite Storage console

## Debugging Steps

### Enable Detailed Logging

The improved error handling now provides detailed console output:

```javascript
// Open browser dev tools → Console
// Look for messages starting with:
📸 Starting upload of X images...
🔄 Processing image 1...
📤 Uploading base64 image...
✅ Uploaded image 1: file_id
❌ Failed to upload image: error_details
```

### Check Network Tab

1. Open browser Dev Tools → Network tab
2. Try uploading images
3. Look for failed requests to Appwrite storage endpoints
4. Check response codes and error messages

## Storage Bucket Configuration

### Required Appwrite Bucket Settings

```
Bucket ID: product-images
Max File Size: 5242880 bytes (5MB)
Allowed Extensions: jpg,jpeg,png,webp,gif
Enabled: Yes

Permissions:
- create("users") or create("any")
- read("any")
```

### How to Configure in Appwrite Console

1. Go to Storage section
2. Click "Create Bucket" or select existing bucket
3. Set Bucket ID to `product-images`
4. Configure file size and extensions
5. Add required permissions in Settings tab

## Recent Improvements

### Enhanced Error Handling
- ✅ Better error messages for users
- ✅ Detailed validation before upload attempts
- ✅ Specific error codes (401, 404, 413)
- ✅ Graceful handling of partial failures

### Improved User Experience
- ✅ Real-time upload progress indicators
- ✅ Visual feedback during processing
- ✅ Clear error messages with solutions
- ✅ Upload status for individual images

### Validation Improvements
- ✅ File size validation (5MB limit)
- ✅ File type validation (JPEG, PNG, WebP, GIF)
- ✅ Image count limits (max 10 per product)
- ✅ Base64 data validation

## Need More Help?

1. Run the diagnostic script: `npm run verify:storage`
2. Check browser console for detailed error logs
3. Verify your Appwrite project settings
4. Test with small, simple images first

## Technical Details

The image upload process:
1. User selects files → Client-side validation
2. Files converted to base64 → Stored in form state
3. Product save → Images uploaded to storage bucket
4. File IDs returned → Stored in database
5. Display → File IDs converted to view URLs

Each step now has improved error handling and user feedback.