"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import ProductService from '@/lib/services/product';
import { formatPrice } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { AFRICAN_ART_CATEGORIES } from '@/lib/constants';

interface ProductCreationFormProps {
  className?: string;
  productId?: string; // If editing existing product
  onSave?: (product: any) => void;
  onCancel?: () => void;
}

interface ProductFormData {
  title: string;
  description: string;
  price: number;
  salePrice?: number;
  category: string;
  subcategory?: string;
  tags: string[];
  images: string[];
  stock: number;
  sku?: string;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'inches';
  };
  weight?: {
    value: number;
    unit: 'kg' | 'g';
  };
  color?: string;
  brand?: string;
  materials: string[];
  customization: {
    available: boolean;
    options: string[];
    additionalCost?: number;
  };
  shipping: {
    freeShipping: boolean;
    shippingCost?: number;
    processingTime: string;
  };
  status: 'draft' | 'active';
}

const defaultFormData: ProductFormData = {
  title: '',
  description: '',
  price: 0,
  category: '',
  subcategory: '',
  tags: [],
  images: [],
  stock: 1,
  sku: '',
  color: '',
  brand: '',
  materials: [],
  customization: {
    available: false,
    options: [],
  },
  shipping: {
    freeShipping: true,
    processingTime: '1-2 business days',
  },
  status: 'draft',
};

export default function ProductCreationForm({ 
  className = "", 
  productId, 
  onSave, 
  onCancel 
}: ProductCreationFormProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [formData, setFormData] = useState<ProductFormData>(defaultFormData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(1);
  const [imageUploadLoading, setImageUploadLoading] = useState<Set<number>>(new Set());

  // Available categories from constants
  const categories = AFRICAN_ART_CATEGORIES;

  // Processing time options
  const processingTimes = [
    '1 business day',
    '1-2 business days', 
    '3-5 business days',
    '1 week',
    '2 weeks',
    'Custom'
  ];

  // Common materials
  const commonMaterials = [
    'Wood', 'Bronze', 'Clay', 'Cotton', 'Silk', 'Beads', 'Gold', 'Silver',
    'Acrylic', 'Oil Paint', 'Canvas', 'Paper', 'Leather', 'Stone', 'Glass'
  ];

  useEffect(() => {
    if (productId) {
      loadProduct();
    }
  }, [productId]);

  const loadProduct = async () => {
    if (!productId) return;
    
    try {
      setLoading(true);
      const product = await ProductService.getProduct(productId);
      
      if (product) {
        setFormData({
          title: product.title,
          description: product.description,
          price: product.price,
          salePrice: product.salePrice,
          category: product.category,
          subcategory: product.subcategory,
          tags: product.tags || [],
          images: product.images || [],
          stock: product.stock || 1,
          sku: product.sku,
          color: product.color,
          brand: product.brand,
          dimensions: product.dimensions,
          weight: product.weight,
          materials: product.materials || [],
          customization: product.customizationOptions ? {
            available: product.customizable,
            options: Array.isArray(product.customizationOptions) ? product.customizationOptions : [],
            additionalCost: product.customizationOptions?.additionalCost
          } : defaultFormData.customization,
          shipping: product.shippingInfo ? {
            freeShipping: product.shippingInfo.cost === 0,
            shippingCost: product.shippingInfo.cost,
            processingTime: product.shippingInfo.processingTime || '1-2 business days'
          } : defaultFormData.shipping,
          status: product.status,
        });
      }
    } catch (error) {
      console.error('Failed to load product:', error);
      setErrors({ general: 'Failed to load product data' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      // If category changes, reset subcategory
      if (field === 'category') {
        newData.subcategory = '';
      }
      return newData;
    });
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    setSuccess(null);
  }, [errors]);

  const handleNestedInputChange = useCallback((parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...prev[parent as keyof typeof prev], [field]: value }
    }));
  }, []);

  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const input = e.currentTarget;
      const tag = input.value.trim().toLowerCase();
      
      if (tag && !formData.tags.includes(tag) && formData.tags.length < 10) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, tag]
        }));
        input.value = '';
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files) return;
    
    const maxImages = 10;
    const maxSize = 5 * 1024 * 1024; // 5MB per image
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    
    // Clear previous errors
    setErrors(prev => ({ ...prev, images: '' }));
    
    // Check total image limit
    if (formData.images.length + files.length > maxImages) {
      setErrors(prev => ({ ...prev, images: `Maximum ${maxImages} images allowed. You can upload ${maxImages - formData.images.length} more.` }));
      return;
    }

    const uploadPromises: Promise<void>[] = [];
    let uploadedCount = 0;
    let failedCount = 0;
    const uploadErrors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileIndex = formData.images.length + i; // Unique index for loading state
      
      // Validate file size
      if (file.size > maxSize) {
        const sizeMB = Math.round(file.size / (1024 * 1024));
        uploadErrors.push(`"${file.name}" is too large (${sizeMB}MB). Max 5MB allowed.`);
        failedCount++;
        continue;
      }

      // Validate file type
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        uploadErrors.push(`"${file.name}" is not supported. Allowed: JPEG, PNG, WebP, GIF.`);
        failedCount++;
        continue;
      }

      // Create upload promise
      const uploadPromise = new Promise<void>((resolve, reject) => {
        setImageUploadLoading(prev => new Set(prev).add(fileIndex));
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
          const imageUrl = e.target?.result as string;
          
          // Additional validation on the base64 result
          if (!imageUrl || !imageUrl.startsWith('data:image/')) {
            uploadErrors.push(`Failed to process "${file.name}". Invalid image data.`);
            failedCount++;
            reject(new Error(`Invalid image data for ${file.name}`));
            return;
          }
          
          setFormData(prev => ({
            ...prev,
            images: [...prev.images, imageUrl]
          }));
          
          uploadedCount++;
          resolve();
        };
        
        reader.onerror = () => {
          uploadErrors.push(`Failed to read "${file.name}". File may be corrupted.`);
          failedCount++;
          reject(new Error(`Failed to read ${file.name}`));
        };
        
        reader.readAsDataURL(file);
      });

      uploadPromises.push(
        uploadPromise.finally(() => {
          setImageUploadLoading(prev => {
            const newSet = new Set(prev);
            newSet.delete(fileIndex);
            return newSet;
          });
        })
      );
    }

    // Wait for all uploads to complete
    try {
      await Promise.allSettled(uploadPromises);
      
      // Update user with results
      if (uploadedCount > 0 && failedCount === 0) {
        setSuccess(`Successfully added ${uploadedCount} image${uploadedCount > 1 ? 's' : ''}`);
      } else if (uploadedCount > 0 && failedCount > 0) {
        setErrors(prev => ({ 
          ...prev, 
          images: `${uploadedCount} image(s) uploaded successfully. ${failedCount} failed:\n${uploadErrors.join('\n')}`
        }));
      } else if (failedCount > 0) {
        setErrors(prev => ({ 
          ...prev, 
          images: `All ${failedCount} images failed:\n${uploadErrors.join('\n')}`
        }));
      }
      
    } catch (error) {
      console.error('Image upload process failed:', error);
      setErrors(prev => ({ 
        ...prev, 
        images: 'Failed to process images. Please try again.'
      }));
    }
  };

  const removeImage = (indexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, index) => index !== indexToRemove)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required field validation
    if (!formData.title.trim()) newErrors.title = 'Product title is required';
    if (!formData.description.trim()) newErrors.description = 'Product description is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (formData.price <= 0) newErrors.price = 'Price must be greater than 0';
    if (formData.stock < 0) newErrors.stock = 'Stock cannot be negative';
    if (formData.images.length === 0) newErrors.images = 'At least one product image is required';

    // Sale price validation
    if (formData.salePrice && formData.salePrice >= formData.price) {
      newErrors.salePrice = 'Sale price must be less than regular price';
    }

    // Description length validation
    if (formData.description.length < 50) {
      newErrors.description = 'Description should be at least 50 characters';
    }

    // Title length validation
    if (formData.title.length < 10) {
      newErrors.title = 'Title should be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (publishStatus: 'draft' | 'active' = formData.status) => {
    if (!user) return;

    if (!validateForm()) {
      setActiveStep(1); // Go back to first step with errors
      return;
    }

    try {
      setSaving(true);
      setErrors({});

      const productData = {
        sellerId: user.$id,
        title: formData.title,
        description: formData.description,
        price: formData.price,
        salePrice: formData.salePrice,
        category: formData.category,
        subcategory: formData.subcategory,
        tags: formData.tags,
        images: formData.images,
        stock: formData.stock,
        location: user.location || 'Nigeria', // Default location
        materials: formData.materials,
        dimensions: formData.dimensions,
        customizable: formData.customization.available,
        customizationOptions: formData.customization.available ? {
          options: formData.customization.options,
          additionalCost: formData.customization.additionalCost || 0
        } : undefined,
        shippingInfo: {
          cost: formData.shipping.freeShipping ? 0 : (formData.shipping.shippingCost || 0),
          methods: ['standard'],
          processingTime: formData.shipping.processingTime
        },
        // Add custom fields that aren't in the base interface
        sku: formData.sku,
        color: formData.color,
        brand: formData.brand,
        weight: formData.weight
      };

      let result;
      if (productId) {
        result = await ProductService.updateProduct(productId, productData);
        setSuccess('Product updated successfully!');
      } else {
        result = await ProductService.createProduct(productData);
        setSuccess('Product created successfully!');
      }

      if (onSave) {
        onSave(result);
      } else {
        // Navigate back to products list
        router.push('/seller?tab=products');
      }

    } catch (error) {
      console.error('Failed to save product:', error);
      setErrors({ general: 'Failed to save product. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const calculateCompletionPercentage = () => {
    const requiredFields = ['title', 'description', 'category', 'price', 'stock'];
    const optionalFields = ['tags', 'materials', 'images', 'customization', 'dimensions', 'weight', 'color', 'brand'];
    
    const requiredComplete = requiredFields.filter(field => {
      const value = formData[field as keyof ProductFormData];
      if (typeof value === 'string') {
        return value.trim().length > 0;
      }
      if (typeof value === 'number') {
        return value > 0;
      }
      return !!value;
    }).length;
    
    const optionalComplete = optionalFields.filter(field => {
      const value = formData[field as keyof ProductFormData];
      if (field === 'tags' || field === 'materials') {
        return Array.isArray(value) && value.length > 0;
      }
      if (field === 'images') {
        return Array.isArray(value) && value.length > 0;
      }
      if (field === 'customization') {
        return value && (value as any).available;
      }
      if (field === 'dimensions') {
        return value && (value as any).length && (value as any).width && (value as any).height;
      }
      if (field === 'weight') {
        return value && (value as any).value;
      }
      if (typeof value === 'string') {
        return value.trim().length > 0;
      }
      return !!value;
    }).length;
    
    return Math.round(((requiredComplete * 2 + optionalComplete) / (requiredFields.length * 2 + optionalFields.length)) * 100);
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <Card className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-text-primary mx-auto mb-4"></div>
            <p className="text-text-muted">Loading product data...</p>
          </div>
        </Card>
      </div>
    );
  }

  const completionPercentage = calculateCompletionPercentage();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Progress */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-text-primary">
              {productId ? 'Edit Product' : 'Create New Product'}
            </h2>
            <p className="text-text-muted">
              {productId ? 'Update your product information' : 'Add a new product to your store'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-text-primary">{completionPercentage}%</div>
            <div className="text-sm text-text-muted">Complete</div>
          </div>
        </div>
        
        <div className="w-full bg-background-tertiary rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </Card>

      {/* Success/Error Messages */}
      {success && (
        <Card className="p-4 bg-green-500/10 border-green-500/20">
          <p className="text-green-400 flex items-center">
            <span className="mr-2">✅</span>
            {success}
          </p>
        </Card>
      )}
      
      {errors.general && (
        <Card className="p-4 bg-red-500/10 border-red-500/20">
          <p className="text-red-400 flex items-center">
            <span className="mr-2">❌</span>
            {errors.general}
          </p>
        </Card>
      )}

      {/* Multi-step Form */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Step Navigation */}
        <div className="lg:col-span-1">
          <Card className="p-4 sticky top-6">
            <h3 className="font-semibold text-text-primary mb-4">Steps</h3>
            <div className="space-y-2">
              {[
                { step: 1, label: 'Basic Info', icon: '📝' },
                { step: 2, label: 'Images & Media', icon: '🖼️' },
                { step: 3, label: 'Details & Specs', icon: '📏' },
                { step: 4, label: 'Pricing & Stock', icon: '💰' },
                { step: 5, label: 'Shipping & Options', icon: '📦' }
              ].map(({ step, label, icon }) => (
                <button
                  key={step}
                  onClick={() => setActiveStep(step)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors ${
                    activeStep === step 
                      ? 'bg-text-primary text-background-primary' 
                      : 'text-text-muted hover:text-text-primary hover:bg-background-secondary'
                  }`}
                >
                  <span>{icon}</span>
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Form Content */}
        <div className="lg:col-span-3">
          <Card className="p-6">
            {/* Step 1: Basic Information */}
            {activeStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Basic Information</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Product Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="e.g., Traditional African Mask with Intricate Carvings"
                    className={`w-full px-3 py-2 bg-background-secondary border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.title ? 'border-red-500' : 'border-neutral-700'
                    }`}
                  />
                  {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
                  <p className="text-text-muted text-xs mt-1">{formData.title.length}/100 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe your artwork, its inspiration, materials used, and what makes it special..."
                    rows={6}
                    className={`w-full px-3 py-2 bg-background-secondary border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.description ? 'border-red-500' : 'border-neutral-700'
                    }`}
                  />
                  {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
                  <p className="text-text-muted text-xs mt-1">{formData.description.length}/1000 characters (minimum 50)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className={`w-full px-3 py-2 bg-background-secondary border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.category ? 'border-red-500' : 'border-neutral-700'
                    }`}
                  >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                  {errors.category && <p className="text-red-400 text-sm mt-1">{errors.category}</p>}
                </div>

                {formData.category && (
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Subcategory
                    </label>
                    <select
                      value={formData.subcategory || ''}
                      onChange={(e) => handleInputChange('subcategory', e.target.value)}
                      className="w-full px-3 py-2 bg-background-secondary border border-neutral-700 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a subcategory (optional)</option>
                      {categories.find(c => c.id === formData.category)?.subcategories.map(subcategory => (
                        <option key={subcategory} value={subcategory}>{subcategory}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Tags</label>
                  <input
                    type="text"
                    onKeyDown={handleTagInput}
                    placeholder="Enter tags and press Enter (e.g., traditional, handmade, african)"
                    className="w-full px-3 py-2 bg-background-secondary border border-neutral-700 rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map(tag => (
                      <span
                        key={tag}
                        className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full text-sm flex items-center"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 text-blue-300 hover:text-blue-100"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <p className="text-text-muted text-xs mt-1">{formData.tags.length}/10 tags</p>
                </div>
              </div>
            )}

            {/* Step 2: Images & Media */}
            {activeStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Images & Media</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Product Images <span className="text-red-500">*</span>
                  </label>
                  
                  {/* Upload Area */}
                  <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    imageUploadLoading.size > 0 
                      ? 'border-blue-500 bg-blue-500/5' 
                      : 'border-neutral-600 hover:border-neutral-500'
                  }`}>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      onChange={(e) => handleImageUpload(e.target.files)}
                      className="hidden"
                      id="image-upload"
                      disabled={imageUploadLoading.size > 0}
                    />
                    <label htmlFor="image-upload" className={`cursor-pointer ${imageUploadLoading.size > 0 ? 'pointer-events-none' : ''}`}>
                      <div className="w-16 h-16 mx-auto mb-4 bg-background-secondary rounded-full flex items-center justify-center">
                        {imageUploadLoading.size > 0 ? (
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        ) : (
                          <span className="text-2xl">📸</span>
                        )}
                      </div>
                      <p className="text-text-primary font-medium">
                        {imageUploadLoading.size > 0 ? 'Processing Images...' : 'Upload Product Images'}
                      </p>
                      <p className="text-text-muted text-sm mt-1">
                        {imageUploadLoading.size > 0 
                          ? `Uploading ${imageUploadLoading.size} image${imageUploadLoading.size > 1 ? 's' : ''}...`
                          : 'Drag & drop or click to browse. Max 10 images, 5MB each. Supports JPEG, PNG, WebP, GIF.'
                        }
                      </p>
                    </label>
                  </div>
                  
                  {/* Error Messages */}
                  {errors.images && (
                    <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-red-400 text-sm whitespace-pre-line">{errors.images}</p>
                    </div>
                  )}
                  
                  {/* Image Grid */}
                  {formData.images.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-text-primary">
                          Uploaded Images ({formData.images.length}/{10})
                        </h4>
                        {formData.images.length > 1 && (
                          <p className="text-xs text-text-muted">First image will be the primary image</p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {formData.images.map((image, index) => (
                          <div key={index} className="relative group">
                            <div className="relative">
                              <img 
                                src={image} 
                                alt={`Product ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg border-2 border-neutral-700"
                              />
                              {/* Loading overlay for this specific image */}
                              {imageUploadLoading.has(index) && (
                                <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                </div>
                              )}
                            </div>
                            
                            <button
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                              title="Remove image"
                            >
                              ×
                            </button>
                            
                            {index === 0 && (
                              <div className="absolute bottom-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow-lg">
                                Primary
                              </div>
                            )}
                            
                            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                              {index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Details & Specifications */}
            {activeStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Details & Specifications</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">SKU</label>
                    <input
                      type="text"
                      value={formData.sku || ''}
                      onChange={(e) => handleInputChange('sku', e.target.value)}
                      placeholder="Product SKU (auto-generated if empty)"
                      className="w-full px-3 py-2 bg-background-secondary border border-neutral-700 rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Brand</label>
                    <input
                      type="text"
                      value={formData.brand || ''}
                      onChange={(e) => handleInputChange('brand', e.target.value)}
                      placeholder="Brand or artist name"
                      className="w-full px-3 py-2 bg-background-secondary border border-neutral-700 rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Color</label>
                  <input
                    type="text"
                    value={formData.color || ''}
                    onChange={(e) => handleInputChange('color', e.target.value)}
                    placeholder="Primary color or color combination"
                    className="w-full px-3 py-2 bg-background-secondary border border-neutral-700 rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Materials</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {commonMaterials.map(material => (
                      <button
                        key={material}
                        onClick={() => {
                          if (!formData.materials.includes(material)) {
                            handleInputChange('materials', [...formData.materials, material]);
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                          formData.materials.includes(material)
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-background-secondary text-text-muted border-neutral-600 hover:border-blue-500'
                        }`}
                      >
                        {material}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        const input = e.currentTarget;
                        const material = input.value.trim();
                        if (material && !formData.materials.includes(material)) {
                          handleInputChange('materials', [...formData.materials, material]);
                          input.value = '';
                        }
                      }
                    }}
                    placeholder="Add custom material and press Enter"
                    className="w-full px-3 py-2 bg-background-secondary border border-neutral-700 rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.materials.map(material => (
                      <span
                        key={material}
                        className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full text-sm flex items-center"
                      >
                        {material}
                        <button
                          onClick={() => handleInputChange('materials', formData.materials.filter(m => m !== material))}
                          className="ml-1 text-blue-300 hover:text-blue-100"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Dimensions</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <input
                      type="number"
                      value={formData.dimensions?.length || ''}
                      onChange={(e) => handleNestedInputChange('dimensions', 'length', Number(e.target.value))}
                      placeholder="Length"
                      className="px-3 py-2 bg-background-secondary border border-neutral-700 rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      value={formData.dimensions?.width || ''}
                      onChange={(e) => handleNestedInputChange('dimensions', 'width', Number(e.target.value))}
                      placeholder="Width"
                      className="px-3 py-2 bg-background-secondary border border-neutral-700 rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      value={formData.dimensions?.height || ''}
                      onChange={(e) => handleNestedInputChange('dimensions', 'height', Number(e.target.value))}
                      placeholder="Height"
                      className="px-3 py-2 bg-background-secondary border border-neutral-700 rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={formData.dimensions?.unit || 'cm'}
                      onChange={(e) => handleNestedInputChange('dimensions', 'unit', e.target.value)}
                      className="px-3 py-2 bg-background-secondary border border-neutral-700 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="cm">cm</option>
                      <option value="inches">inches</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Weight</label>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      value={formData.weight?.value || ''}
                      onChange={(e) => handleNestedInputChange('weight', 'value', Number(e.target.value))}
                      placeholder="Weight value"
                      className="flex-1 px-3 py-2 bg-background-secondary border border-neutral-700 rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={formData.weight?.unit || 'kg'}
                      onChange={(e) => handleNestedInputChange('weight', 'unit', e.target.value)}
                      className="px-3 py-2 bg-background-secondary border border-neutral-700 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="g">grams (g)</option>
                      <option value="kg">kilograms (kg)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Pricing & Stock */}
            {activeStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Pricing & Stock</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Regular Price (NGN) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.price || ''}
                      onChange={(e) => handleInputChange('price', Number(e.target.value))}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className={`w-full px-3 py-2 bg-background-secondary border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.price ? 'border-red-500' : 'border-neutral-700'
                      }`}
                    />
                    {errors.price && <p className="text-red-400 text-sm mt-1">{errors.price}</p>}
                    {formData.price > 0 && (
                      <p className="text-text-muted text-xs mt-1">
                        Displayed as: {formatPrice(formData.price)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Sale Price (NGN)
                    </label>
                    <input
                      type="number"
                      value={formData.salePrice || ''}
                      onChange={(e) => handleInputChange('salePrice', e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="0.00 (optional)"
                      min="0"
                      step="0.01"
                      className={`w-full px-3 py-2 bg-background-secondary border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.salePrice ? 'border-red-500' : 'border-neutral-700'
                      }`}
                    />
                    {errors.salePrice && <p className="text-red-400 text-sm mt-1">{errors.salePrice}</p>}
                    {formData.salePrice && (
                      <p className="text-text-muted text-xs mt-1">
                        Sale price: {formatPrice(formData.salePrice)}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Stock Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => handleInputChange('stock', Number(e.target.value))}
                    min="0"
                    className={`w-full px-3 py-2 bg-background-secondary border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.stock ? 'border-red-500' : 'border-neutral-700'
                    }`}
                  />
                  {errors.stock && <p className="text-red-400 text-sm mt-1">{errors.stock}</p>}
                  <p className="text-text-muted text-xs mt-1">
                    Available inventory for this product
                  </p>
                </div>

                {formData.price > 0 && formData.salePrice && (
                  <Card className="p-4 bg-green-500/10 border-green-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-400 font-medium">Sale Discount</p>
                        <p className="text-text-muted text-sm">
                          Customers save {formatPrice(formData.price - formData.salePrice)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-400">
                          {Math.round(((formData.price - formData.salePrice) / formData.price) * 100)}%
                        </p>
                        <p className="text-text-muted text-sm">OFF</p>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* Step 5: Shipping & Options */}
            {activeStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Shipping & Options</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-3">Shipping</label>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.shipping.freeShipping}
                        onChange={(e) => handleNestedInputChange('shipping', 'freeShipping', e.target.checked)}
                        className="mr-3"
                      />
                      <span className="text-text-primary">Free shipping</span>
                    </label>
                    
                    {!formData.shipping.freeShipping && (
                      <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">
                          Shipping Cost (NGN)
                        </label>
                        <input
                          type="number"
                          value={formData.shipping.shippingCost || ''}
                          onChange={(e) => handleNestedInputChange('shipping', 'shippingCost', Number(e.target.value))}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 bg-background-secondary border border-neutral-700 rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Processing Time</label>
                  <select
                    value={formData.shipping.processingTime}
                    onChange={(e) => handleNestedInputChange('shipping', 'processingTime', e.target.value)}
                    className="w-full px-3 py-2 bg-background-secondary border border-neutral-700 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {processingTimes.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                  <p className="text-text-muted text-xs mt-1">
                    How long before you can ship this item
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-3">Customization Options</label>
                  <label className="flex items-center mb-3">
                    <input
                      type="checkbox"
                      checked={formData.customization.available}
                      onChange={(e) => handleNestedInputChange('customization', 'available', e.target.checked)}
                      className="mr-3"
                    />
                    <span className="text-text-primary">Allow customization</span>
                  </label>

                  {formData.customization.available && (
                    <div className="space-y-3 pl-6 border-l-2 border-blue-500/20">
                      <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">
                          Additional Cost (NGN)
                        </label>
                        <input
                          type="number"
                          value={formData.customization.additionalCost || ''}
                          onChange={(e) => handleNestedInputChange('customization', 'additionalCost', e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="0.00 (optional)"
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 bg-background-secondary border border-neutral-700 rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">
                          Customization Options
                        </label>
                        <input
                          type="text"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ',') {
                              e.preventDefault();
                              const input = e.currentTarget;
                              const option = input.value.trim();
                              if (option && !formData.customization.options.includes(option)) {
                                handleNestedInputChange('customization', 'options', [...formData.customization.options, option]);
                                input.value = '';
                              }
                            }
                          }}
                          placeholder="e.g., 'Text engraving', 'Color choice' (press Enter to add)"
                          className="w-full px-3 py-2 bg-background-secondary border border-neutral-700 rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex flex-wrap gap-2 mt-2">
                          {formData.customization.options.map(option => (
                            <span
                              key={option}
                              className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full text-sm flex items-center"
                            >
                              {option}
                              <button
                                onClick={() => handleNestedInputChange('customization', 'options', formData.customization.options.filter(o => o !== option))}
                                className="ml-1 text-purple-300 hover:text-purple-100"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Product Preview */}
                <Card className="p-4 bg-blue-500/5 border-blue-500/20">
                  <h4 className="font-semibold text-text-primary mb-3">Product Preview</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      {formData.images[0] && (
                        <img 
                          src={formData.images[0]} 
                          alt={formData.title}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-medium text-text-primary">{formData.title || 'Product Title'}</h5>
                      <p className="text-2xl font-bold text-text-primary">
                        {formData.salePrice ? (
                          <>
                            <span className="text-green-400">{formatPrice(formData.salePrice)}</span>
                            <span className="text-text-muted line-through text-base ml-2">{formatPrice(formData.price)}</span>
                          </>
                        ) : (
                          formatPrice(formData.price)
                        )}
                      </p>
                      <p className="text-text-muted text-sm">
                        Category: {formData.category ? categories.find(c => c.id === formData.category)?.name || formData.category : 'Uncategorized'}
                      </p>
                      <p className="text-text-muted text-sm">
                        Stock: {formData.stock} available
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Form Navigation */}
            <div className="flex items-center justify-between pt-6 mt-6 border-t border-neutral-800">
              <div className="flex space-x-3">
                {activeStep > 1 && (
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveStep(activeStep - 1)}
                  >
                    Previous
                  </Button>
                )}
                {onCancel && (
                  <Button 
                    variant="outline" 
                    onClick={onCancel}
                  >
                    Cancel
                  </Button>
                )}
              </div>
              
              <div className="flex space-x-3">
                {activeStep < 5 ? (
                  <Button onClick={() => setActiveStep(activeStep + 1)}>
                    Next Step
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="outline"
                      onClick={() => handleSave('draft')}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save as Draft'}
                    </Button>
                    <Button 
                      onClick={() => handleSave('active')}
                      disabled={saving}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {saving ? 'Publishing...' : 'Publish Product'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}