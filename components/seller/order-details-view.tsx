"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { Order } from "@/lib/services/order";

interface OrderDetailsViewProps {
  order: Order;
  onStatusUpdate?: (orderId: string, newStatus: string) => Promise<void>;
  isUpdating?: boolean;
  currentUserRole: 'seller' | 'buyer';
}

export default function OrderDetailsView({ 
  order, 
  onStatusUpdate, 
  isUpdating = false,
  currentUserRole
}: OrderDetailsViewProps) {
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!onStatusUpdate || updatingStatus) return;
    
    try {
      setUpdatingStatus(true);
      await onStatusUpdate(order.$id, newStatus);
    } catch (error) {
      console.error('Failed to update order status:', error);
      alert('Failed to update order status. Please try again.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'shipped':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'processing':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'confirmed':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'pending':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-500/10 text-green-500';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'failed':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canUpdateStatus = currentUserRole === 'seller' && onStatusUpdate;

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary mb-2">
              Order #{order.orderId}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="text-text-muted">
                Placed on {formatDate(order.$createdAt)}
              </span>
              <span className="text-text-muted">•</span>
              <span className={`px-3 py-1 rounded-full text-sm border ${getStatusColor(order.orderStatus)}`}>
                {order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
              </span>
              <span className="text-text-muted">•</span>
              <span className={`px-3 py-1 rounded-full text-sm ${getPaymentStatusColor(order.paymentStatus)}`}>
                Payment: {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
              </span>
            </div>
          </div>
          
          {canUpdateStatus && (
            <div className="flex items-center space-x-3">
              <span className="text-text-muted text-sm">Update Status:</span>
              <select
                value={order.orderStatus}
                onChange={(e) => handleStatusUpdate(e.target.value)}
                disabled={updatingStatus || isUpdating}
                className="px-3 py-2 bg-background-secondary border border-neutral-700 rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-text-primary disabled:opacity-50"
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              {(updatingStatus || isUpdating) && (
                <div className="w-5 h-5 border-2 border-text-primary border-t-transparent animate-spin rounded-full"></div>
              )}
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Order Items</h2>
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-4 border-b border-neutral-800 last:border-b-0">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-background-secondary rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🎨</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-text-primary">{item.title}</h3>
                      <p className="text-sm text-text-muted">Quantity: {item.quantity}</p>
                      <p className="text-sm text-text-muted">{formatPrice(item.price / 100)} each</p>
                      {item.customization && Object.keys(item.customization).length > 0 && (
                        <div className="mt-1">
                          <p className="text-xs text-text-muted">Customizations:</p>
                          {Object.entries(item.customization).map(([key, value]) => (
                            <span key={key} className="text-xs text-text-secondary mr-2">
                              {key}: {String(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-text-primary">{formatPrice(item.subtotal / 100)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Order Summary */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Order Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-text-muted">
                <span>Subtotal:</span>
                <span>{formatPrice(order.totalAmount / 100)}</span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span>Shipping:</span>
                <span>{formatPrice(order.shippingAmount / 100)}</span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span>Tax:</span>
                <span>{formatPrice(order.taxAmount / 100)}</span>
              </div>
              <div className="pt-3 border-t border-neutral-800">
                <div className="flex justify-between text-lg font-semibold text-text-primary">
                  <span>Total:</span>
                  <span>{formatPrice(order.finalAmount / 100)}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Order Information */}
        <div className="space-y-6">
          {/* Customer Information */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              {currentUserRole === 'seller' ? 'Customer Information' : 'Your Information'}
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-text-muted">Customer ID:</p>
                <p className="text-text-primary">#{order.buyerId.slice(-8)}</p>
              </div>
              {order.shippingAddress.fullName && (
                <div>
                  <p className="text-text-muted">Name:</p>
                  <p className="text-text-primary">{order.shippingAddress.fullName}</p>
                </div>
              )}
              {order.shippingAddress.phoneNumber && (
                <div>
                  <p className="text-text-muted">Phone:</p>
                  <p className="text-text-primary">{order.shippingAddress.phoneNumber}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Shipping Address */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Shipping Address</h2>
            <div className="text-sm space-y-1">
              <p className="text-text-primary font-medium">{order.shippingAddress.fullName}</p>
              <p className="text-text-muted">{order.shippingAddress.addressLine1}</p>
              <p className="text-text-muted">
                {order.shippingAddress.city}, {order.shippingAddress.state}
              </p>
              <p className="text-text-muted">{order.shippingAddress.postalCode}</p>
              <p className="text-text-muted">{order.shippingAddress.country}</p>
            </div>
          </Card>

          {/* Payment Information */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Payment Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Status:</span>
                <span className={`px-2 py-1 rounded text-xs ${getPaymentStatusColor(order.paymentStatus)}`}>
                  {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Method:</span>
                <span className="text-text-primary">Paystack</span>
              </div>
              {order.paymentReference && (
                <div>
                  <p className="text-text-muted">Reference:</p>
                  <p className="text-text-primary font-mono text-xs">{order.paymentReference}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Shipping Information */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Shipping Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Method:</span>
                <span className="text-text-primary capitalize">{order.shippingMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Cost:</span>
                <span className="text-text-primary">{formatPrice(order.shippingAmount / 100)}</span>
              </div>
              {order.trackingNumber && (
                <div>
                  <p className="text-text-muted">Tracking Number:</p>
                  <p className="text-text-primary font-mono text-xs">{order.trackingNumber}</p>
                </div>
              )}
              <div>
                <p className="text-text-muted">Estimated Delivery:</p>
                <p className="text-text-primary">3-5 business days</p>
              </div>
            </div>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Order Notes</h2>
              <p className="text-text-muted text-sm">{order.notes}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}