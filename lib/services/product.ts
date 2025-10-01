import { databases, storage } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { PRODUCT_STATUS, AFRICAN_ART_CATEGORIES } from '@/lib/constants';
import { NotificationService } from './notifications';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'mose_database';

export interface Product {
  $id: string;
  productId: string;
  sellerId: string;
  title: string;
  description: string;
  price: number;
  salePrice?: number;
  category: string;
  subcategory?: string;
  tags: string[];
  images: string[];
  customizable: boolean;
  customizationOptions?: Record<string, any>;
  stock: number;
  status: string;
  location: string;
  materials?: string[];
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
  };
  shippingInfo?: {
    cost: number;
    methods: string[];
    processingTime: string;
  };
  views: number;
  likes: number;
  averageRating?: number;
  reviewCount: number;
  $createdAt: string;
  $updatedAt: string;
}

export interface ProductFilters {
  category?: string;
  subcategory?: string;
  priceMin?: number;
  priceMax?: number;
  location?: string;
  search?: string;
  sellerId?: string;
  status?: string;
  customizable?: boolean;
  inStock?: boolean;
  featured?: boolean;
  excludeProductId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'popular' | 'rating' | 'name_asc' | 'name_desc';
}

export interface CreateProductData {
  sellerId: string;
  title: string;
  description: string;
  price: number;
  salePrice?: number;
  category: string;
  subcategory?: string;
  tags?: string[];
  images?: string[];
  customizable?: boolean;
  customizationOptions?: Record<string, any>;
  stock?: number;
  location: string;
  materials?: string[];
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
  };
  shippingInfo?: {
    cost: number;
    methods: string[];
    processingTime: string;
  };
}

export class ProductService {
  private static readonly COLLECTION_ID = 'products';
  private static readonly PRODUCT_IMAGES_BUCKET = 'product-images';

  /**
   * Get image URL from file ID
   */
  private static getImageUrl(fileId: string): string {
    if (!fileId || fileId.startsWith('http')) {
      return fileId; // Return as-is if it's already a URL
    }
    
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '';
    
    return `${endpoint}/storage/buckets/${this.PRODUCT_IMAGES_BUCKET}/files/${fileId}/view?project=${projectId}`;
  }

  /**
   * Upload images to storage and return file IDs
   */
  private static async uploadImages(images: string[], sellerId: string): Promise<string[]> {
    console.log(`📸 Starting upload of ${images.length} images for seller ${sellerId}`);
    const uploadedImageIds: string[] = [];
    const uploadErrors: string[] = [];

    if (!images || images.length === 0) {
      throw new Error('No images provided for upload');
    }

    for (let i = 0; i < images.length; i++) {
      try {
        const imageData = images[i];
        console.log(`🔄 Processing image ${i + 1}, type: ${typeof imageData}`);
        
        // Skip empty images
        if (!imageData) {
          uploadErrors.push(`Image ${i + 1}: Empty image data`);
          continue;
        }

        // If it's already a file ID or URL, keep as is
        if (!imageData.startsWith('data:image/')) {
          uploadedImageIds.push(imageData);
          console.log(`📎 Kept existing image reference ${i + 1}:`, imageData.substring(0, 50));
          continue;
        }
        
        console.log(`📤 Uploading base64 image ${i + 1}...`);
        
        // Convert base64 to File object (the correct way for Appwrite)
        const response = await fetch(imageData);
        if (!response.ok) {
          throw new Error(`Failed to convert base64 to blob: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        console.log(`📄 Blob created - size: ${blob.size} bytes, type: ${blob.type}`);
        
        if (blob.size === 0) {
          throw new Error('Created blob is empty');
        }

        // Validate file size
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (blob.size > maxSize) {
          throw new Error(`File too large (${Math.round(blob.size / 1024 / 1024)}MB). Maximum 5MB allowed.`);
        }
        
        // Extract file extension from MIME type
        const mimeType = blob.type;
        let fileExtension = 'jpg'; // Default fallback
        
        if (mimeType === 'image/png') fileExtension = 'png';
        else if (mimeType === 'image/jpeg') fileExtension = 'jpg';
        else if (mimeType === 'image/webp') fileExtension = 'webp';
        else if (mimeType === 'image/gif') fileExtension = 'gif';
        
        // Create unique filename
        const fileName = `product_${sellerId}_${Date.now()}_${i}.${fileExtension}`;
        console.log(`📝 Uploading as: ${fileName}`);
        
        // Create File object (this is what Appwrite expects!)
        const file = new File([blob], fileName, { type: mimeType });
        
        // Upload using Appwrite v15 syntax (positional parameters)
        const uploadedFile = await storage.createFile(
          this.PRODUCT_IMAGES_BUCKET,  // bucketId
          ID.unique(),                  // fileId  
          file,                         // file (File object)
          [
            'read("any")'               // permissions (optional)
          ]
        );
        
        if (!uploadedFile || !uploadedFile.$id) {
          throw new Error('Upload succeeded but no file ID returned');
        }
        
        uploadedImageIds.push(uploadedFile.$id);
        console.log(`✅ Successfully uploaded image ${i + 1} with ID: ${uploadedFile.$id}`);
        
      } catch (error: any) {
        const errorMessage = `Image ${i + 1}: ${error.message || error}`;
        uploadErrors.push(errorMessage);
        console.error(`❌ Failed to upload image ${i + 1}:`, error);
        
        // Enhanced error handling for common Appwrite issues
        if (error.code === 401) {
          console.error('→ Permission denied - check bucket create permissions');
        } else if (error.code === 404) {
          console.error('→ Bucket not found - verify bucket exists and ID is correct');
        } else if (error.message?.includes('File extension not allowed')) {
          console.error('→ File type not allowed - check bucket allowed extensions');
        } else if (error.code === 413) {
          console.error('→ File too large - reduce file size or increase bucket limit');
        }
      }
    }

    console.log(`🏁 Upload process completed. ${uploadedImageIds.length}/${images.length} images uploaded successfully.`);
    
    // If no images were uploaded successfully, throw an error
    if (uploadedImageIds.length === 0) {
      const errorSummary = uploadErrors.length > 0 
        ? `All image uploads failed:\n${uploadErrors.join('\n')}`
        : 'No images were uploaded. Unknown error occurred.';
      throw new Error(errorSummary);
    }

    // Log warnings for partial failures
    if (uploadErrors.length > 0) {
      console.warn(`⚠️ Some images failed to upload:`, uploadErrors);
    }

    return uploadedImageIds;
  }

  /**
   * Create a new product with MCP validation
   */
  static async createProduct(productData: CreateProductData): Promise<Product> {
    try {
      console.log('🔄 Creating product with MCP validation...', productData);

      // Validate seller ID
      if (!productData.sellerId) {
        throw new Error('Seller ID is required');
      }

      // Validate category exists
      const validCategory = AFRICAN_ART_CATEGORIES.find(cat => cat.id === productData.category);
      if (!validCategory) {
        throw new Error(`Invalid category: ${productData.category}`);
      }

      // Upload images to storage if any
      let imageFileIds: string[] = [];
      if (productData.images && productData.images.length > 0) {
        console.log('📸 Uploading product images...');
        try {
          imageFileIds = await this.uploadImages(productData.images, productData.sellerId);
        } catch (uploadError: any) {
          console.error('❌ Image upload failed:', uploadError);
          throw new Error(`Failed to upload product images: ${uploadError.message}`);
        }
      }

      // Prepare product document with all available fields
      const productDocument = {
        // Required fields
        sellerId: productData.sellerId,
        title: productData.title.trim(),
        price: Math.round(productData.price * 100),
        description: productData.description.trim(),
        category: productData.category,
        status: PRODUCT_STATUS.PENDING_APPROVAL,
        
        // Optional fields
        productId: ID.unique(),
        salePrice: productData.salePrice ? Math.round(productData.salePrice * 100) : null,
        subcategory: productData.subcategory || null,
        tags: JSON.stringify(productData.tags || []),
        images: JSON.stringify(imageFileIds),
        customizable: productData.customizable || false,
        customizationOptions: productData.customizationOptions ? JSON.stringify(productData.customizationOptions) : null,
        stock: productData.stock || 1,
        location: productData.location || 'Nigeria',
        materials: JSON.stringify(productData.materials || []),
        dimensions: productData.dimensions ? JSON.stringify(productData.dimensions) : null,
        shippingInfo: productData.shippingInfo ? JSON.stringify(productData.shippingInfo) : null,
        views: 0,
        likes: 0,
        averageRating: 0,
        reviewCount: 0
      };

      console.log('📋 Product document to create:', productDocument);

      // Create product with MCP-enhanced client
      const product = await databases.createDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        ID.unique(),
        productDocument
      );

      console.log('✅ Product created successfully:', product.$id);
      return this.transformProduct(product);

    } catch (error) {
      console.error('❌ Error creating product:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create product');
    }
  }

  /**
   * Get products with advanced filtering and MCP optimization
   */
  static async getProducts(filters: ProductFilters = {}): Promise<{
    products: Product[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      console.log('🔄 Fetching products with filters:', filters);

      const queries: string[] = [];
      
      // Status filter (default to active products for public queries only)
      if (filters.status) {
        queries.push(Query.equal('status', filters.status));
      } else if (!filters.sellerId) {
        // Only default to active status for public queries, not seller queries
        queries.push(Query.equal('status', PRODUCT_STATUS.ACTIVE));
      }

      // Category filters
      if (filters.category) {
        queries.push(Query.equal('category', filters.category));
      }
      
      if (filters.subcategory) {
        queries.push(Query.equal('subcategory', filters.subcategory));
      }

      // Price range filters
      if (filters.priceMin !== undefined) {
        queries.push(Query.greaterThanEqual('price', Math.round(filters.priceMin * 100)));
      }
      
      if (filters.priceMax !== undefined) {
        queries.push(Query.lessThanEqual('price', Math.round(filters.priceMax * 100)));
      }

      // Location filter
      if (filters.location) {
        queries.push(Query.equal('location', filters.location));
      }

      // Seller filter
      if (filters.sellerId) {
        queries.push(Query.equal('sellerId', filters.sellerId));
      }
      
      // Exclude product filter (for related products)
      if (filters.excludeProductId) {
        queries.push(Query.notEqual('$id', filters.excludeProductId));
      }

      // Stock filter
      if (filters.inStock) {
        queries.push(Query.greaterThan('stock', 0));
      }

      // Customizable filter
      if (filters.customizable !== undefined) {
        queries.push(Query.equal('customizable', filters.customizable));
      }

      // Search functionality
      if (filters.search) {
        queries.push(Query.search('title', filters.search));
      }

      // Sorting
      if (filters.sortBy) {
        switch (filters.sortBy) {
          case 'newest':
            queries.push(Query.orderDesc('$createdAt'));
            break;
          case 'oldest':
            queries.push(Query.orderAsc('$createdAt'));
            break;
          case 'price_asc':
            queries.push(Query.orderAsc('price'));
            break;
          case 'price_desc':
            queries.push(Query.orderDesc('price'));
            break;
          case 'popular':
            queries.push(Query.orderDesc('views'));
            break;
          case 'rating':
            queries.push(Query.orderDesc('averageRating'));
            break;
          case 'name_asc':
            queries.push(Query.orderAsc('title'));
            break;
          case 'name_desc':
            queries.push(Query.orderDesc('title'));
            break;
          default:
            queries.push(Query.orderDesc('$createdAt'));
        }
      } else {
        queries.push(Query.orderDesc('$createdAt'));
      }

      // Pagination
      const limit = Math.min(filters.limit || 12, 100);
      const offset = filters.offset || 0;
      
      queries.push(Query.limit(limit));
      if (offset > 0) {
        queries.push(Query.offset(offset));
      }

      // Fetch products with MCP optimization
      const response = await databases.listDocuments(
        DATABASE_ID,
        this.COLLECTION_ID,
        queries
      );

      const products = response.documents.map(this.transformProduct);
      const hasMore = response.total > offset + products.length;

      console.log(`✅ Retrieved ${products.length} of ${response.total} products`);

      return {
        products,
        total: response.total,
        hasMore
      };

    } catch (error) {
      console.error('❌ Error fetching products:', error);
      throw new Error('Failed to fetch products');
    }
  }

  /**
   * Get a single product by ID
   */
  static async getProduct(productId: string): Promise<Product> {
    try {
      console.log('🔄 Fetching product:', productId);

      const product = await databases.getDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        productId
      );

      console.log('✅ Product retrieved:', product.$id);
      return this.transformProduct(product);

    } catch (error) {
      console.error('❌ Error fetching product:', error);
      throw new Error('Product not found');
    }
  }

  /**
   * Update product
   */
  static async updateProduct(
    productId: string, 
    updateData: Partial<CreateProductData>
  ): Promise<Product> {
    try {
      console.log('🔄 Updating product:', productId);

      // Prepare update document
      const updateDocument: Record<string, any> = {};

      if (updateData.title) updateDocument.title = updateData.title.trim();
      if (updateData.description) updateDocument.description = updateData.description.trim();
      if (updateData.price !== undefined) updateDocument.price = Math.round(updateData.price * 100);
      if (updateData.salePrice !== undefined) updateDocument.salePrice = Math.round(updateData.salePrice * 100);
      if (updateData.category) updateDocument.category = updateData.category;
      if (updateData.subcategory !== undefined) updateDocument.subcategory = updateData.subcategory;
      if (updateData.tags) updateDocument.tags = JSON.stringify(updateData.tags);
      if (updateData.images) updateDocument.images = JSON.stringify(updateData.images);
      if (updateData.customizable !== undefined) updateDocument.customizable = updateData.customizable;
      if (updateData.customizationOptions) updateDocument.customizationOptions = JSON.stringify(updateData.customizationOptions);
      if (updateData.stock !== undefined) updateDocument.stock = updateData.stock;
      if (updateData.location) updateDocument.location = updateData.location;
      if (updateData.materials) updateDocument.materials = JSON.stringify(updateData.materials);
      if (updateData.dimensions) updateDocument.dimensions = JSON.stringify(updateData.dimensions);
      if (updateData.shippingInfo) updateDocument.shippingInfo = JSON.stringify(updateData.shippingInfo);

      const updatedProduct = await databases.updateDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        productId,
        updateDocument
      );

      console.log('✅ Product updated:', updatedProduct.$id);
      return this.transformProduct(updatedProduct);

    } catch (error) {
      console.error('❌ Error updating product:', error);
      throw new Error('Failed to update product');
    }
  }

  /**
   * Update product status
   */
  static async updateProductStatus(
    productId: string, 
    status: string
  ): Promise<Product> {
    try {
      console.log(`🔄 Updating product status to ${status}:`, productId);

      if (!Object.values(PRODUCT_STATUS).includes(status as any)) {
        throw new Error(`Invalid product status: ${status}`);
      }

      const updatedProduct = await databases.updateDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        productId,
        { status }
      );

      console.log('✅ Product status updated:', updatedProduct.$id);
      return this.transformProduct(updatedProduct);

    } catch (error) {
      console.error('❌ Error updating product status:', error);
      throw new Error('Failed to update product status');
    }
  }

  /**
   * Update product stock
   */
  static async updateProductStock(
    productId: string, 
    stock: number
  ): Promise<Product> {
    try {
      console.log(`🔄 Updating product stock to ${stock}:`, productId);

      if (stock < 0) {
        throw new Error('Stock cannot be negative');
      }

      const updatedProduct = await databases.updateDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        productId,
        { stock }
      );

      console.log('✅ Product stock updated:', updatedProduct.$id);
      return this.transformProduct(updatedProduct);

    } catch (error) {
      console.error('❌ Error updating product stock:', error);
      throw new Error('Failed to update product stock');
    }
  }

  /**
   * Decrement product stock by a specified quantity
   */
  static async decrementProductStock(
    productId: string,
    quantity: number
  ): Promise<Product> {
    try {
      console.log(`🔄 Decrementing product stock by ${quantity}:`, productId);

      // First get current stock
      const currentProduct = await this.getProduct(productId);
      const newStock = Math.max(0, currentProduct.stock - quantity);

      // Determine if product should be marked as sold
      let updateData: any = { stock: newStock };
      
      if (newStock === 0 && currentProduct.status === PRODUCT_STATUS.ACTIVE) {
        updateData.status = PRODUCT_STATUS.SOLD;
        console.log(`📦 Product marked as sold due to zero stock:`, productId);
      }

      const updatedProduct = await databases.updateDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        productId,
        updateData
      );

      console.log('✅ Product stock decremented:', updatedProduct.$id);
      return this.transformProduct(updatedProduct);

    } catch (error) {
      console.error('❌ Error decrementing product stock:', error);
      throw new Error('Failed to decrement product stock');
    }
  }

  /**
   * Process order fulfillment - update stock for multiple products
   */
  static async processOrderFulfillment(
    orderItems: Array<{ productId: string; quantity: number }>
  ): Promise<{ success: boolean; updatedProducts: Product[]; errors: string[] }> {
    const updatedProducts: Product[] = [];
    const errors: string[] = [];

    console.log(`🔄 Processing order fulfillment for ${orderItems.length} items`);

    for (const item of orderItems) {
      try {
        // Verify product exists and has sufficient stock
        const product = await this.getProduct(item.productId);
        
        if (product.stock < item.quantity) {
          errors.push(`Insufficient stock for product ${product.title}. Available: ${product.stock}, Requested: ${item.quantity}`);
          continue;
        }

        // Decrement stock
        const updatedProduct = await this.decrementProductStock(item.productId, item.quantity);
        updatedProducts.push(updatedProduct);

      } catch (error) {
        console.error(`❌ Error processing item ${item.productId}:`, error);
        errors.push(`Failed to update stock for product ${item.productId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const success = errors.length === 0;
    console.log(`${success ? '✅' : '⚠️'} Order fulfillment completed. Updated: ${updatedProducts.length}, Errors: ${errors.length}`);

    return {
      success,
      updatedProducts,
      errors
    };
  }

  /**
   * Check and restore product stock (for order cancellations)
   */
  static async restoreProductStock(
    productId: string,
    quantity: number
  ): Promise<Product> {
    try {
      console.log(`🔄 Restoring product stock by ${quantity}:`, productId);

      // Get current product
      const currentProduct = await this.getProduct(productId);
      const newStock = currentProduct.stock + quantity;

      // If product was sold and we're restoring stock, make it active again
      let updateData: any = { stock: newStock };
      
      if (currentProduct.status === PRODUCT_STATUS.SOLD && newStock > 0) {
        updateData.status = PRODUCT_STATUS.ACTIVE;
        console.log(`📦 Product restored to active status:`, productId);
      }

      const updatedProduct = await databases.updateDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        productId,
        updateData
      );

      console.log('✅ Product stock restored:', updatedProduct.$id);
      return this.transformProduct(updatedProduct);

    } catch (error) {
      console.error('❌ Error restoring product stock:', error);
      throw new Error('Failed to restore product stock');
    }
  }

  /**
   * Increment product views
   */
  static async incrementViews(productId: string): Promise<void> {
    try {
      const product = await this.getProduct(productId);
      
      await databases.updateDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        productId,
        { views: product.views + 1 }
      );

      console.log('✅ Product views incremented:', productId);

    } catch (error) {
      console.error('❌ Error incrementing views:', error);
      // Don't throw error for view counting failures
    }
  }

  /**
   * Toggle product like
   */
  static async toggleLike(productId: string, increment: boolean = true): Promise<void> {
    try {
      const product = await this.getProduct(productId);
      const newLikes = increment ? product.likes + 1 : Math.max(0, product.likes - 1);
      
      await databases.updateDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        productId,
        { likes: newLikes }
      );

      console.log('✅ Product likes updated:', productId, newLikes);

    } catch (error) {
      console.error('❌ Error updating likes:', error);
      throw new Error('Failed to update likes');
    }
  }

  /**
   * Update product rating
   */
  static async updateRating(
    productId: string, 
    averageRating: number, 
    reviewCount: number
  ): Promise<void> {
    try {
      await databases.updateDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        productId,
        { 
          averageRating: Math.round(averageRating * 100) / 100, // Round to 2 decimal places
          reviewCount 
        }
      );

      console.log('✅ Product rating updated:', productId, averageRating);

    } catch (error) {
      console.error('❌ Error updating rating:', error);
      throw new Error('Failed to update product rating');
    }
  }

  /**
   * Delete product
   */
  static async deleteProduct(productId: string): Promise<void> {
    try {
      console.log('🔄 Deleting product:', productId);

      await databases.deleteDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        productId
      );

      console.log('✅ Product deleted:', productId);

    } catch (error) {
      console.error('❌ Error deleting product:', error);
      throw new Error('Failed to delete product');
    }
  }

  /**
   * Get products by seller
   */
  static async getProductsBySeller(
    sellerId: string, 
    filters: Omit<ProductFilters, 'sellerId'> = {}
  ): Promise<{
    products: Product[];
    total: number;
    hasMore: boolean;
  }> {
    return this.getProducts({ ...filters, sellerId });
  }

  /**
   * Get seller products (alias for getProductsBySeller)
   */
  static async getSellerProducts(
    sellerId: string, 
    filters: Omit<ProductFilters, 'sellerId'> = {}
  ): Promise<{
    products: Product[];
    total: number;
    hasMore: boolean;
  }> {
    return this.getProductsBySeller(sellerId, filters);
  }

  /**
   * Get featured products
   */
  static async getFeaturedProducts(limit: number = 12): Promise<Product[]> {
    const result = await this.getProducts({
      sortBy: 'popular',
      limit,
      status: PRODUCT_STATUS.ACTIVE
    });
    return result.products;
  }

  /**
   * Search products with full-text search
   */
  static async searchProducts(
    searchTerm: string, 
    filters: Omit<ProductFilters, 'search'> = {}
  ): Promise<{
    products: Product[];
    total: number;
    hasMore: boolean;
  }> {
    return this.getProducts({ ...filters, search: searchTerm });
  }

  /**
   * Admin Methods - Product Moderation
   */

  /**
   * Get products for admin moderation
   */
  static async getProductsForModeration(
    status?: 'draft' | 'pending_approval' | 'active' | 'rejected' | 'flagged' | 'sold',
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    products: Product[];
    total: number;
    statusCounts: {
      all: number;
      draft: number;
      pending_approval: number;
      active: number;
      rejected: number;
      flagged: number;
      sold: number;
    };
  }> {
    try {
      const queries = [
        Query.orderDesc('$updatedAt'),
        Query.limit(limit),
        Query.offset(offset)
      ];

      if (status) {
        queries.push(Query.equal('status', status));
      }

      // Get filtered products
      const response = await databases.listDocuments(
        DATABASE_ID,
        'products',
        queries
      );

      // Get status counts for all statuses (parallel queries for performance)
      const statusCountPromises = [
        databases.listDocuments(DATABASE_ID, 'products', [Query.limit(1)]), // all count
        databases.listDocuments(DATABASE_ID, 'products', [Query.equal('status', PRODUCT_STATUS.DRAFT), Query.limit(1)]),
        databases.listDocuments(DATABASE_ID, 'products', [Query.equal('status', PRODUCT_STATUS.PENDING_APPROVAL), Query.limit(1)]),
        databases.listDocuments(DATABASE_ID, 'products', [Query.equal('status', PRODUCT_STATUS.ACTIVE), Query.limit(1)]),
        databases.listDocuments(DATABASE_ID, 'products', [Query.equal('status', PRODUCT_STATUS.REJECTED), Query.limit(1)]),
        databases.listDocuments(DATABASE_ID, 'products', [Query.equal('status', PRODUCT_STATUS.FLAGGED), Query.limit(1)]),
        databases.listDocuments(DATABASE_ID, 'products', [Query.equal('status', PRODUCT_STATUS.SOLD), Query.limit(1)])
      ];

      const statusCountResponses = await Promise.all(statusCountPromises);

      const statusCounts = {
        all: statusCountResponses[0].total,
        draft: statusCountResponses[1].total,
        pending_approval: statusCountResponses[2].total,
        active: statusCountResponses[3].total,
        rejected: statusCountResponses[4].total,
        flagged: statusCountResponses[5].total,
        sold: statusCountResponses[6].total,
      };

      return {
        products: response.documents.map(this.transformProduct),
        total: response.total,
        statusCounts
      };
    } catch (error) {
      console.error('❌ Error fetching products for moderation:', error);
      throw new Error('Failed to fetch products for moderation');
    }
  }

  /**
   * Submit a product for approval (seller)
   */
  static async submitProductForApproval(productId: string, sellerId: string): Promise<Product> {
    try {
      console.log('🔄 Submitting product for approval:', productId);

      // Get the product to verify ownership
      const product = await databases.getDocument(
        DATABASE_ID,
        'products',
        productId
      );

      // Verify seller owns this product
      if (product.sellerId !== sellerId) {
        throw new Error('Unauthorized: You can only submit your own products');
      }

      // Verify product is not already in an approved state
      if (product.status === PRODUCT_STATUS.ACTIVE) {
        throw new Error(`Product is already approved and active. Current status: ${product.status}`);
      }

      // Update product status to pending approval (handles draft, rejected, or flagged products)
      const updatedProduct = await databases.updateDocument(
        DATABASE_ID,
        'products',
        productId,
        {
          status: PRODUCT_STATUS.PENDING_APPROVAL
        }
      );

      // Send notification to seller about successful submission
      try {
        await NotificationService.notifyAdminNewProductSubmission(productId, sellerId, updatedProduct.title);
      } catch (notificationError) {
        console.warn('⚠️ Failed to send product submission notification:', notificationError);
      }

      console.log('✅ Product submitted for approval:', productId);
      return this.transformProduct(updatedProduct);
    } catch (error) {
      console.error('❌ Error submitting product for approval:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to submit product for approval');
    }
  }

  /**
   * Approve a product (admin only)
   */
  static async approveProduct(productId: string, adminUserId: string): Promise<Product> {
    try {
      console.log('🔄 Approving product:', productId);

      // TODO: Verify admin permissions
      // const adminProfile = await UserService.getProfileByUserId(adminUserId);
      // if (adminProfile?.userType !== 'admin') {
      //   throw new Error('Unauthorized: Admin access required');
      // }

      const updatedProduct = await databases.updateDocument(
        DATABASE_ID,
        'products',
        productId,
        {
          status: 'active'
        }
      );

      console.log('✅ Product approved:', productId);
      return this.transformProduct(updatedProduct);
    } catch (error) {
      console.error('❌ Error approving product:', error);
      throw new Error('Failed to approve product');
    }
  }

  /**
   * Reject a product (admin only)
   */
  static async rejectProduct(productId: string, adminUserId: string, reason?: string): Promise<Product> {
    try {
      console.log('🔄 Rejecting product:', productId);

      // TODO: Verify admin permissions
      // const adminProfile = await UserService.getProfileByUserId(adminUserId);
      // if (adminProfile?.userType !== 'admin') {
      //   throw new Error('Unauthorized: Admin access required');
      // }

      const updatedProduct = await databases.updateDocument(
        DATABASE_ID,
        'products',
        productId,
        {
          status: 'rejected'
        }
      );

      // Send rejection notification to seller
      try {
        await NotificationService.notifyProductRejected(sellerId, productId, reason, updatedProduct.title);
      } catch (notificationError) {
        console.warn('⚠️ Failed to send product rejection notification:', notificationError);
      }

      console.log('❌ Product rejected:', productId);
      return this.transformProduct(updatedProduct);
    } catch (error) {
      console.error('❌ Error rejecting product:', error);
      throw new Error('Failed to reject product');
    }
  }

  /**
   * Flag a product for review (admin only)
   */
  static async flagProduct(productId: string, adminUserId: string, reason: string): Promise<Product> {
    try {
      console.log('🔄 Flagging product:', productId);

      // TODO: Verify admin permissions
      // const adminProfile = await UserService.getProfileByUserId(adminUserId);
      // if (adminProfile?.userType !== 'admin') {
      //   throw new Error('Unauthorized: Admin access required');
      // }

      const updatedProduct = await databases.updateDocument(
        DATABASE_ID,
        'products',
        productId,
        {
          status: 'flagged'
        }
      );

      // Send flagged notification to seller
      try {
        await NotificationService.notifyProductFlagged(sellerId, productId, reason, updatedProduct.title);
      } catch (notificationError) {
        console.warn('⚠️ Failed to send product flagged notification:', notificationError);
      }

      console.log('🚩 Product flagged:', productId);
      return this.transformProduct(updatedProduct);
    } catch (error) {
      console.error('❌ Error flagging product:', error);
      throw new Error('Failed to flag product');
    }
  }

  /**
   * Get product moderation statistics
   */
  static async getModerationStats(): Promise<{
    totalProducts: number;
    activeProducts: number;
    pendingProducts: number;
    flaggedProducts: number;
    rejectedProducts: number;
  }> {
    try {
      const [total, active, pending, flagged, rejected] = await Promise.all([
        databases.listDocuments(DATABASE_ID, 'products', [Query.limit(1)]),
        databases.listDocuments(DATABASE_ID, 'products', [Query.equal('status', 'active'), Query.limit(1)]),
        databases.listDocuments(DATABASE_ID, 'products', [Query.equal('status', 'pending_approval'), Query.limit(1)]),
        databases.listDocuments(DATABASE_ID, 'products', [Query.equal('status', 'flagged'), Query.limit(1)]),
        databases.listDocuments(DATABASE_ID, 'products', [Query.equal('status', 'rejected'), Query.limit(1)])
      ]);

      return {
        totalProducts: total.total,
        activeProducts: active.total,
        pendingProducts: pending.total,
        flaggedProducts: flagged.total,
        rejectedProducts: rejected.total
      };
    } catch (error) {
      console.error('❌ Error fetching moderation stats:', error);
      return {
        totalProducts: 0,
        activeProducts: 0,
        pendingProducts: 0,
        flaggedProducts: 0,
        rejectedProducts: 0
      };
    }
  }

  /**
   * Get general product statistics
   */
  static async getProductStats(): Promise<{
    totalProducts: number;
    activeProducts: number;
    averageRating: number;
  }> {
    try {
      const [total, active, allProducts] = await Promise.all([
        databases.listDocuments(DATABASE_ID, 'products', [Query.limit(1)]),
        databases.listDocuments(DATABASE_ID, 'products', [Query.equal('status', 'active'), Query.limit(1)]),
        databases.listDocuments(DATABASE_ID, 'products', [Query.limit(1000)]) // Get sample for rating calculation
      ]);

      // Calculate average rating from sample
      const ratings = allProducts.documents
        .filter(p => p.averageRating > 0)
        .map(p => p.averageRating);
      
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        : 0;

      return {
        totalProducts: total.total,
        activeProducts: active.total,
        averageRating: Math.round(averageRating * 100) / 100 // Round to 2 decimal places
      };
    } catch (error) {
      console.error('❌ Error fetching product stats:', error);
      return {
        totalProducts: 0,
        activeProducts: 0,
        averageRating: 0
      };
    }
  }

  /**
   * Transform database document to Product interface
   */
  private static transformProduct(doc: any): Product {
    return {
      $id: doc.$id,
      productId: doc.productId || doc.$id,
      sellerId: doc.sellerId,
      title: doc.title,
      description: doc.description,
      price: doc.price / 100, // Convert from kobo to naira
      salePrice: doc.salePrice ? doc.salePrice / 100 : undefined,
      category: doc.category,
      subcategory: doc.subcategory || '',
      tags: doc.tags ? JSON.parse(doc.tags) : [],
      images: doc.images ? JSON.parse(doc.images).map((fileId: string) => 
        ProductService.getImageUrl(fileId)
      ) : [],
      customizable: doc.customizable || false,
      customizationOptions: doc.customizationOptions ? JSON.parse(doc.customizationOptions) : undefined,
      stock: doc.stock || 1,
      status: doc.status,
      location: doc.location || 'Nigeria',
      materials: doc.materials ? JSON.parse(doc.materials) : [],
      dimensions: doc.dimensions ? JSON.parse(doc.dimensions) : undefined,
      shippingInfo: doc.shippingInfo ? JSON.parse(doc.shippingInfo) : undefined,
      views: doc.views || 0,
      likes: doc.likes || 0,
      averageRating: doc.averageRating || 0,
      reviewCount: doc.reviewCount || 0,
      $createdAt: doc.$createdAt,
      $updatedAt: doc.$updatedAt
    };
  }
}

export default ProductService;