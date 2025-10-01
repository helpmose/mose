"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Header from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import { useWishlistStore } from "@/store/wishlist-store";
import { formatPrice } from "@/lib/utils";
import { OrderService, Order } from "@/lib/services/order";
import { GiftService } from "@/lib/services/gifts";
import WishlistButton from "@/components/ui/wishlist-button";

function BuyerDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuthStore();
  const { items: wishlistItems } = useWishlistStore();
  const [activeTab, setActiveTab] = useState("overview");
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    deliveredOrders: 0
  });
  const [giftEvents, setGiftEvents] = useState<any[]>([]);
  const [loadingGifts, setLoadingGifts] = useState(false);

  // Get tab from URL params if available
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Load orders and calculate stats
  useEffect(() => {
    const loadOrders = async () => {
      if (!user) return;
      
      try {
        setOrdersLoading(true);
        setOrdersError(null);
        
        const response = await OrderService.getOrders({
          buyerId: user.$id,
          sortBy: 'newest',
          limit: 50
        });
        
        setOrders(response.orders);
        
        // Calculate stats
        const totalOrders = response.orders.length;
        const totalSpent = response.orders.reduce((sum, order) => sum + order.finalAmount, 0);
        const deliveredOrders = response.orders.filter(order => order.orderStatus === 'delivered').length;
        
        setStats({
          totalOrders,
          totalSpent,
          deliveredOrders
        });
        
      } catch (error) {
        console.error('Error loading orders:', error);
        setOrdersError('Failed to load order history');
      } finally {
        setOrdersLoading(false);
      }
    };

    const loadGiftEvents = async () => {
      if (!user) return;

      try {
        setLoadingGifts(true);
        console.log('🔄 Loading gift events for user:', user.$id);
        const result = await GiftService.getGiftEvents({
          creatorId: user.$id,
          sortBy: 'newest',
          limit: 20
        });
        console.log('📊 Dashboard result:', result);
        setGiftEvents(result.events);
      } catch (error) {
        console.error('Failed to load gift events:', error);
        setGiftEvents([]);
      } finally {
        setLoadingGifts(false);
      }
    };

    loadOrders();
    loadGiftEvents();
  }, [user]);

  if (!user) {
    router.push('/login');
    return null;
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "orders", label: "Orders", icon: "📦" },
    { id: "gifts", label: "Gift Events", icon: "🎁" },
    { id: "wishlist", label: "Wishlist", icon: "❤️" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ];

  const formatOrderStatus = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return { label: 'Delivered', className: 'bg-green-500/10 text-green-500' };
      case 'shipped':
        return { label: 'Shipped', className: 'bg-blue-500/10 text-blue-500' };
      case 'processing':
        return { label: 'Processing', className: 'bg-yellow-500/10 text-yellow-500' };
      case 'confirmed':
        return { label: 'Confirmed', className: 'bg-purple-500/10 text-purple-500' };
      case 'pending':
        return { label: 'Pending', className: 'bg-orange-500/10 text-orange-500' };
      case 'cancelled':
        return { label: 'Cancelled', className: 'bg-red-500/10 text-red-500' };
      default:
        return { label: status.charAt(0).toUpperCase() + status.slice(1), className: 'bg-gray-500/10 text-gray-500' };
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm">Total Orders</p>
                    {ordersLoading ? (
                      <div className="w-8 h-8 bg-gray-200 animate-pulse rounded"></div>
                    ) : (
                      <p className="text-2xl font-semibold text-text-primary">{stats.totalOrders}</p>
                    )}
                  </div>
                  <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📦</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm">Total Spent</p>
                    {ordersLoading ? (
                      <div className="w-20 h-8 bg-gray-200 animate-pulse rounded"></div>
                    ) : (
                      <p className="text-2xl font-semibold text-text-primary">{formatPrice(stats.totalSpent / 100)}</p>
                    )}
                  </div>
                  <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">💰</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm">Wishlist Items</p>
                    <p className="text-2xl font-semibold text-text-primary">{wishlistItems.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">❤️</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Recent Orders */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Orders</h3>
              {ordersLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 bg-background-secondary rounded-lg">
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : ordersError ? (
                <div className="text-center py-8">
                  <p className="text-red-500">{ordersError}</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-background-secondary rounded-full flex items-center justify-center">
                    <span className="text-2xl">📦</span>
                  </div>
                  <h4 className="text-lg font-medium text-text-primary mb-2">No orders yet</h4>
                  <p className="text-text-muted mb-4">Start shopping to see your order history here</p>
                  <Button onClick={() => router.push('/products')}>
                    Browse Products
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.slice(0, 3).map((order) => {
                    const statusInfo = formatOrderStatus(order.orderStatus);
                    return (
                      <div key={order.$id} className="flex items-center justify-between p-4 bg-background-secondary rounded-lg">
                        <div>
                          <p className="font-medium text-text-primary">Order #{order.orderId}</p>
                          <p className="text-sm text-text-muted">
                            {new Date(order.$createdAt).toLocaleDateString()} • {order.items.length} items
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-text-primary">{formatPrice(order.finalAmount / 100)}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.className}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        );

      case "orders":
        return (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-text-primary">Order History</h3>
                <p className="text-text-muted text-sm">{stats.totalOrders} orders</p>
              </div>
              
              {ordersLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-4 bg-background-secondary rounded-lg">
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : ordersError ? (
                <div className="text-center py-8">
                  <p className="text-red-500">{ordersError}</p>
                  <Button 
                    onClick={() => window.location.reload()} 
                    className="mt-4"
                  >
                    Retry
                  </Button>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-24 h-24 mx-auto mb-6 bg-background-secondary rounded-full flex items-center justify-center">
                    <span className="text-4xl">📦</span>
                  </div>
                  <h4 className="text-xl font-medium text-text-primary mb-2">No orders yet</h4>
                  <p className="text-text-muted mb-6">Your order history will appear here after you make your first purchase</p>
                  <Button onClick={() => router.push('/products')}>
                    Start Shopping
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => {
                    const statusInfo = formatOrderStatus(order.orderStatus);
                    return (
                      <div key={order.$id} className="p-4 bg-background-secondary rounded-lg border border-neutral-800">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium text-text-primary">Order #{order.orderId}</p>
                            <p className="text-sm text-text-muted">
                              {new Date(order.$createdAt).toLocaleDateString('en-NG', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })} • {order.items.length} items
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-text-primary">{formatPrice(order.finalAmount / 100)}</p>
                            <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.className}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                        </div>
                        
                        {/* Order Items Summary */}
                        <div className="border-t border-neutral-700 pt-3">
                          <div className="space-y-2">
                            {order.items.slice(0, 2).map((item, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span className="text-text-muted">{item.title} x{item.quantity}</span>
                                <span className="text-text-primary">{formatPrice(item.subtotal / 100)}</span>
                              </div>
                            ))}
                            {order.items.length > 2 && (
                              <p className="text-xs text-text-muted">
                                +{order.items.length - 2} more items
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 pt-3 border-t border-neutral-700 flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => router.push(`/checkout/success?orderId=${order.$id}`)}
                          >
                            View Details
                          </Button>
                          {order.orderStatus === 'pending' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                if (confirm('Are you sure you want to cancel this order?')) {
                                  // TODO: Implement order cancellation
                                  console.log('Cancel order:', order.$id);
                                }
                              }}
                            >
                              Cancel Order
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        );

      case "gifts":
        return (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-text-primary">My Gift Events</h3>
                <Button onClick={() => router.push('/create')}>
                  Create New Event
                </Button>
              </div>

              {loadingGifts ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-text-primary mx-auto mb-4"></div>
                  <p className="text-text-muted">Loading gift events...</p>
                </div>
              ) : giftEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {giftEvents.map((event) => (
                    <Card key={event.$id} className="p-4 hover:bg-background-secondary/50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-text-primary mb-1">{event.title}</h4>
                          <p className="text-sm text-text-muted">{event.eventType}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          event.status === 'active' ? 'bg-green-500/20 text-green-400' :
                          event.status === 'draft' ? 'bg-gray-500/20 text-gray-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {event.status}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-text-muted">
                          <span className="mr-2">🎂</span>
                          <span>{new Date(event.eventDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center text-sm text-text-muted">
                          <span className="mr-2">👤</span>
                          <span>{event.recipientName}</span>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => router.push(`/gift/${event.$id}`)}
                        >
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/gift/${event.$id}`);
                            alert('Link copied to clipboard!');
                          }}
                        >
                          Share
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-background-secondary rounded-full flex items-center justify-center">
                    <span className="text-2xl">🎁</span>
                  </div>
                  <h4 className="text-lg font-medium text-text-primary mb-2">No gift events yet</h4>
                  <p className="text-text-muted mb-4">Create your first gift event to start collecting gifts from friends</p>
                  <Button onClick={() => router.push('/create')}>
                    Create Gift Event
                  </Button>
                </div>
              )}
            </Card>
          </div>
        );

      case "wishlist":
        return (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-text-primary">My Wishlist</h3>
                <p className="text-text-muted">{wishlistItems.length} items</p>
              </div>
              
              {wishlistItems.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-background-secondary rounded-full flex items-center justify-center">
                    <span className="text-2xl">❤️</span>
                  </div>
                  <h4 className="text-lg font-medium text-text-primary mb-2">Your wishlist is empty</h4>
                  <p className="text-text-muted mb-4">Save items you love to buy them later</p>
                  <Button onClick={() => router.push('/products')}>
                    Browse Products
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {wishlistItems.map((product) => (
                    <Card key={product.$id} className="overflow-hidden">
                      <div className="relative aspect-square">
                        <Image
                          src={product.images?.[0] || "/placeholder-product.jpg"}
                          alt={product.title}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute top-2 right-2">
                          <WishlistButton product={product} />
                        </div>
                      </div>
                      <div className="p-4">
                        <h4 className="font-medium text-text-primary mb-2">{product.title}</h4>
                        <p className="text-text-muted text-sm mb-2">
                          by {product.sellerName}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-text-primary">
                            {formatPrice((product.salePrice || product.price) / 100)}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => router.push(`/products/${product.$id}`)}
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </div>
        );

      case "settings":
        return (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Account Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full bg-background-secondary border border-neutral-700 text-text-primary rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={user.name || ''}
                    readOnly
                    className="w-full bg-background-secondary border border-neutral-700 text-text-primary rounded-md px-3 py-2"
                  />
                </div>
                <div className="pt-4">
                  <Button className="mr-4">Save Changes</Button>
                  <Button variant="outline" onClick={logout}>
                    Logout
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        );

      default:
        return <div>Tab not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <Header />
      
      <div className="container mx-auto px-4 pt-32 pb-16">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-light mb-4">Buyer Dashboard</h1>
          <p className="text-text-muted">Welcome back, {user.name || user.email}!</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap border-b border-neutral-800 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-text-primary text-text-primary"
                  : "border-transparent text-text-muted hover:text-text-primary"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </div>
  );
}

function LoadingDashboard() {
  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <Header />
      <div className="container mx-auto px-4 pt-32 pb-16">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-text-primary mx-auto mb-4"></div>
            <p className="text-text-muted">Loading dashboard...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BuyerDashboard() {
  return (
    <Suspense fallback={<LoadingDashboard />}>
      <BuyerDashboardContent />
    </Suspense>
  );
} 