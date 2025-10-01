"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/store/cart-store";
import { useAuthStore } from "@/store/auth-store";
import { formatPrice } from "@/lib/utils";
import { Product } from "@/lib/types";
import ProductService from "@/lib/services/product";
import { UserService } from "@/lib/services/user";

function ProductDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { addToCart } = useCartStore();
  const { user } = useAuthStore();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [sellerInfo, setSellerInfo] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showImageModal, setShowImageModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProduct() {
      try {
        setIsLoading(true);
        setError(null);
        
        const productId = params.id as string;
        console.log('🔍 Fetching product:', productId);
        
        const fetchedProduct = await ProductService.getProduct(productId);
        setProduct(fetchedProduct);
        
        // Fetch seller information
        if (fetchedProduct.sellerId) {
          try {
            const seller = await UserService.getProfile(fetchedProduct.sellerId);
            setSellerInfo(seller);
          } catch (error) {
            console.warn('Could not fetch seller info:', error);
          }
        }
        
        // Fetch related products from the same category
        if (fetchedProduct.category) {
          try {
            const { products: related } = await ProductService.getProducts({
              category: fetchedProduct.category,
              limit: 4,
              excludeProductId: productId
            });
            setRelatedProducts(related);
          } catch (error) {
            console.warn('Could not fetch related products:', error);
          }
        }
        
      } catch (error) {
        console.error('❌ Error fetching product:', error);
        setError('Failed to load product');
        setProduct(null);
      } finally {
        setIsLoading(false);
      }
    }

    if (params.id) {
      fetchProduct();
    }
  }, [params.id]);

  const handleAddToCart = () => {
    if (!product) return;
    
    addToCart({
      productId: product.$id,
      product,
      quantity,
      customizations: {},
      totalPrice: (product.salePrice || product.price) * quantity
    });

    alert("Product added to cart!");
  };

  const handleBuyNow = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    
    handleAddToCart();
    router.push("/checkout");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-primary text-text-primary">
        <Header />
        <div className="container mx-auto px-4 pt-32 pb-16">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="aspect-square bg-background-secondary rounded-lg"></div>
              <div className="space-y-6">
                <div className="h-8 bg-background-secondary rounded w-3/4"></div>
                <div className="h-4 bg-background-secondary rounded w-1/2"></div>
                <div className="h-24 bg-background-secondary rounded"></div>
                <div className="h-12 bg-background-secondary rounded w-1/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background-primary text-text-primary">
        <Header />
        <div className="container mx-auto px-4 pt-32 pb-16">
          <div className="text-center py-16">
            <h1 className="text-2xl font-semibold mb-4">Product Not Found</h1>
            <p className="text-text-muted mb-8">The product you're looking for doesn't exist.</p>
            <Button onClick={() => router.push("/products")}>
              Browse Products
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const discountPercentage = product.salePrice 
    ? Math.round(((product.price - product.salePrice) / product.price) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <Header />
      
      <div className="container mx-auto px-4 pt-32 pb-16">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-text-muted mb-8">
          <button onClick={() => router.push("/")} className="hover:text-text-primary">Home</button>
          <span>/</span>
          <button onClick={() => router.push("/products")} className="hover:text-text-primary">Products</button>
          <span>/</span>
          <button onClick={() => router.push(`/products?category=${product.category}`)} className="hover:text-text-primary">
            {product.category}
          </button>
          <span>/</span>
          <span className="text-text-primary">{product.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-background-secondary rounded-lg overflow-hidden relative cursor-pointer" onClick={() => setShowImageModal(true)}>
              {product.images && product.images.length > 0 ? (
                <Image
                  src={product.images[selectedImage]}
                  alt={product.title}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-24 h-24 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              
              {product.salePrice && product.salePrice < product.price && (
                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 text-sm font-medium rounded">
                  -{discountPercentage}% OFF
                </div>
              )}
            </div>
            
            {/* Image Thumbnails */}
            {product.images && product.images.length > 1 && (
              <div className="flex space-x-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      index === selectedImage ? 'border-text-primary' : 'border-transparent hover:border-text-secondary'
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${product.title} ${index + 1}`}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Title and Rating */}
            <div>
              <h1 className="text-3xl font-serif font-light mb-2">{product.title}</h1>
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center space-x-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg
                      key={i}
                      className={`w-5 h-5 ${i < Math.floor(product.rating || 0) ? "text-yellow-500 fill-current" : "text-neutral-600"}`}
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                  <span className="text-text-muted ml-2">
                    {product.rating || 0} ({product.reviewCount || 0} reviews)
                  </span>
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-center space-x-4">
              <span className="text-3xl font-bold text-text-primary">
                {formatPrice(product.salePrice || product.price)}
              </span>
              {product.salePrice && product.salePrice < product.price && (
                <span className="text-xl text-text-muted line-through">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-medium mb-3">Description</h3>
              <div className="text-text-muted space-y-3">
                {product.description.split('\n\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>

            {/* Specifications */}
            <Card className="p-4">
              <h4 className="font-medium mb-3">Specifications</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Category:</span>
                  <span>{product.category}</span>
                </div>
                {product.subcategory && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Subcategory:</span>
                    <span>{product.subcategory}</span>
                  </div>
                )}
                {product.dimensions && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Dimensions:</span>
                    <span>{product.dimensions.width} × {product.dimensions.height} {product.dimensions.depth ? `× ${product.dimensions.depth}` : ''} cm</span>
                  </div>
                )}
                {product.dimensions?.weight && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Weight:</span>
                    <span>{product.dimensions.weight} kg</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-text-muted">Stock:</span>
                  <span className={product.stock > 0 ? "text-green-500" : "text-red-500"}>
                    {product.stock > 0 ? `${product.stock} available` : "Out of stock"}
                  </span>
                </div>
              </div>
            </Card>

            {/* Seller Info */}
            <Card className="p-4">
              <h4 className="font-medium mb-3">Seller Information</h4>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-text-primary text-background-primary rounded-full flex items-center justify-center font-bold">
                  {sellerInfo?.businessName ? sellerInfo.businessName[0].toUpperCase() : product.sellerName[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{sellerInfo?.businessName || product.sellerName}</p>
                  {sellerInfo?.location && (
                    <p className="text-text-muted text-sm">{sellerInfo.location}</p>
                  )}
                  {sellerInfo?.rating && (
                    <div className="flex items-center space-x-1 mt-1">
                      <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      <span className="text-sm text-text-muted">{sellerInfo.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" className="ml-auto" onClick={() => router.push(`/sellers/${product.sellerId}`)}>
                  View Profile
                </Button>
              </div>
            </Card>

            {/* Purchase Options */}
            <div className="space-y-4">
              {/* Quantity */}
              <div className="flex items-center space-x-4">
                <label className="font-medium">Quantity:</label>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center"
                    min="1"
                    max={product.stock}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    disabled={quantity >= product.stock}
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <Button
                  onClick={handleAddToCart}
                  variant="outline"
                  className="flex-1"
                  disabled={product.stock === 0}
                >
                  Add to Cart
                </Button>
                <Button
                  onClick={handleBuyNow}
                  className="flex-1 bg-text-primary text-background-primary hover:bg-text-secondary"
                  disabled={product.stock === 0}
                >
                  Buy Now
                </Button>
              </div>

              {/* Wishlist */}
              <Button variant="outline" className="w-full">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Add to Wishlist
              </Button>
            </div>
          </div>
        </div>

        {/* Related Products */}
        <div className="mt-16">
          <h2 className="text-2xl font-serif font-light mb-8">More from this Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.length > 0 ? (
              relatedProducts.map((relatedProduct) => (
                <Card 
                  key={relatedProduct.$id} 
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => router.push(`/products/${relatedProduct.$id}`)}
                >
                  <div className="aspect-square bg-background-secondary overflow-hidden relative">
                    {relatedProduct.images && relatedProduct.images.length > 0 ? (
                      <Image
                        src={relatedProduct.images[0]}
                        alt={relatedProduct.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-sm mb-2 line-clamp-2">{relatedProduct.title}</h3>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-text-primary">
                        {formatPrice(relatedProduct.salePrice || relatedProduct.price)}
                      </span>
                      {relatedProduct.salePrice && (
                        <span className="text-sm text-text-muted line-through">
                          {formatPrice(relatedProduct.price)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 mt-2">
                      <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      <span className="text-sm text-text-muted">{relatedProduct.rating || 0}</span>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <p className="text-text-muted col-span-full text-center py-8">
                {isLoading ? 'Loading related products...' : 'No related products found'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 bg-white/10 backdrop-blur-sm rounded-full p-2 text-white hover:bg-white/20 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {product.images && (
              <Image
                src={product.images[selectedImage]}
                alt={product.title}
                width={800}
                height={800}
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingProduct() {
  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <Header />
      <div className="container mx-auto px-4 pt-32 pb-16">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="aspect-square bg-background-secondary rounded-lg"></div>
            <div className="space-y-6">
              <div className="h-8 bg-background-secondary rounded w-3/4"></div>
              <div className="h-4 bg-background-secondary rounded w-1/2"></div>
              <div className="h-24 bg-background-secondary rounded"></div>
              <div className="h-12 bg-background-secondary rounded w-1/3"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={<LoadingProduct />}>
      <ProductDetailContent />
    </Suspense>
  );
} 