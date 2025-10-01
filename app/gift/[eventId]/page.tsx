"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from "@/components/layout/header";
import { GiftService, GiftEvent, GiftContribution } from '@/lib/services/gifts';
import { ProductService } from '@/lib/services/product';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { toast } from 'sonner';

export default function GiftEventPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const eventId = params.eventId as string;

  const [giftEvent, setGiftEvent] = useState<GiftEvent | null>(null);
  const [contributions, setContributions] = useState<GiftContribution[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [contributionForm, setContributionForm] = useState({
    amount: '',
    message: '',
    contributorName: '',
    contributorEmail: '',
    isAnonymous: false
  });
  const [contributionLoading, setContributionLoading] = useState(false);
  const { addToCart } = useCartStore();

  useEffect(() => {
    if (eventId) {
      loadGiftEvent();
    }
  }, [eventId]);

  const loadGiftEvent = async () => {
    try {
      console.log('🔄 Loading gift event with ID:', eventId);
      const data = await GiftService.getGiftEvent(eventId);
      console.log('✅ Gift event loaded successfully:', data.event.$id);
      setGiftEvent(data.event);
      setContributions(data.contributions);

      // Load wishlist products if they exist
      if (data.event.wishlistProducts && data.event.wishlistProducts.length > 0) {
        const products = await Promise.all(
          data.event.wishlistProducts.map(async (productId) => {
            try {
              return await ProductService.getProduct(productId);
            } catch (error) {
              console.error(`Error loading product ${productId}:`, error);
              return null;
            }
          })
        );
        setWishlistProducts(products.filter(Boolean));
      }
    } catch (error) {
      console.error('Error loading gift event:', error);
      toast.error('Gift event not found');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleContributionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContributionLoading(true);

    try {
      const contributionData = {
        eventId,
        contributorName: contributionForm.contributorName || 'Anonymous',
        contributorEmail: contributionForm.contributorEmail || '',
        amount: parseFloat(contributionForm.amount),
        message: contributionForm.message,
        isAnonymous: contributionForm.isAnonymous,
        contributorId: user?.$id
      };

      await GiftService.createContribution(contributionData);
      toast.success('Contribution created! Payment integration coming soon.');

      // Reload the event to show updated totals
      await loadGiftEvent();

      // Reset form
      setContributionForm({
        amount: '',
        message: '',
        contributorName: '',
        contributorEmail: '',
        isAnonymous: false
      });
    } catch (error) {
      console.error('Error creating contribution:', error);
      toast.error('Failed to create contribution. Please try again.');
    } finally {
      setContributionLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  const getProgressPercentage = () => {
    if (!giftEvent || !giftEvent.giftGoal) return 0;
    return Math.min(((giftEvent.currentAmount || 0) / giftEvent.giftGoal) * 100, 100);
  };

  const getDaysUntilEvent = () => {
    if (!giftEvent) return 0;
    const eventDate = new Date(giftEvent.eventDate);
    const today = new Date();
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleAddToCart = async (product: any) => {
    try {
      // Add product to cart with special gift delivery info
      addToCart({
        productId: product.$id,
        product: product,
        quantity: 1,
        customizations: {
          giftEventId: eventId,
          giftDeliveryAddress: JSON.stringify(giftEvent?.deliveryAddress)
        },
        totalPrice: product.price
      });

      toast.success(`${product.title} added to cart! This will be delivered to ${giftEvent?.recipientName}.`);

      // Only mark as purchased if user is logged in (to avoid permission errors)
      if (user) {
        try {
          await GiftService.markProductAsPurchased(eventId, product.$id);
          await loadGiftEvent(); // Reload to update the wishlist
        } catch (error) {
          console.log('Could not mark as purchased (user not authorized), but item added to cart');
        }
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add item to cart. Please try again.');
    }
  };

  const isPurchased = (productId: string) => {
    return giftEvent?.purchasedItems?.includes(productId) || false;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-primary text-text-primary">
        <Header />
        <div className="container mx-auto px-4 pt-32">
          <div className="text-center">
            <p className="text-text-muted">Loading gift event...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!giftEvent) {
    return (
      <div className="min-h-screen bg-background-primary text-text-primary">
        <Header />
        <div className="container mx-auto px-4 pt-32">
          <div className="text-center">
            <h1 className="text-2xl font-serif mb-4">Gift Event Not Found</h1>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <Header />

      <div className="container mx-auto px-4 pt-32 pb-16">
        {/* Event Header */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-serif font-light mb-4 tracking-wide">
              {giftEvent.title}
            </h1>
            <p className="text-xl text-text-muted mb-2">
              A special {giftEvent.eventType} celebration for{" "}
              <span className="text-text-primary font-medium">{giftEvent.recipientName}</span>
            </p>
            <p className="text-text-muted">
              {new Date(giftEvent.eventDate).toLocaleDateString()} • {getDaysUntilEvent()} days to go
            </p>
          </div>

          {giftEvent.description && (
            <div className="bg-background-secondary border border-neutral-800 rounded-lg p-6 mb-8">
              <p className="text-text-secondary leading-relaxed">{giftEvent.description}</p>
            </div>
          )}

          {/* Progress Section - only for monetary gifts */}
          {giftEvent.allowMonetaryGifts && giftEvent.giftGoal && (
            <div className="bg-background-secondary border border-neutral-800 rounded-lg p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Gift Fund Progress</h3>
                <span className="text-text-muted text-sm">{giftEvent.contributorsCount || 0} contributors</span>
              </div>

              <div className="w-full bg-background-tertiary rounded-full h-4 mb-4">
                <div
                  className="bg-blue-500 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">
                  {formatCurrency(giftEvent.currentAmount || 0)} raised
                </span>
                <span className="text-text-primary font-medium">
                  Goal: {formatCurrency(giftEvent.giftGoal)}
                </span>
              </div>
            </div>
          )}

          {/* Wishlist Section */}
          {wishlistProducts.length > 0 && (
            <div className="bg-background-secondary border border-neutral-800 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-medium mb-6">Gift Wishlist</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlistProducts.map((product) => (
                  <div key={product.$id} className="bg-background-tertiary rounded-lg p-4">
                    <div className="aspect-square bg-background-primary rounded-lg mb-4 overflow-hidden">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0].url || product.images[0]}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-muted">
                          No Image
                        </div>
                      )}
                    </div>
                    <h4 className="font-medium text-text-primary mb-2 line-clamp-2">
                      {product.title}
                    </h4>
                    <p className="text-blue-400 font-medium mb-3">
                      ₦{product.price?.toLocaleString()}
                    </p>
                    {isPurchased(product.$id) ? (
                      <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-2 text-center">
                        <span className="text-green-400 text-sm font-medium">✓ Purchased</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                      >
                        Add to Cart
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bank Account Info - only for monetary gifts */}
          {giftEvent.allowMonetaryGifts && giftEvent.bankAccount && (
            <div className="bg-background-secondary border border-neutral-800 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-medium mb-4">Send Money Gift</h3>
              <div className="bg-background-tertiary rounded-lg p-4">
                <p className="text-text-secondary text-sm mb-2">Bank Details:</p>
                <div className="space-y-1">
                  <p className="text-text-primary"><strong>Account Name:</strong> {giftEvent.bankAccount.accountName}</p>
                  <p className="text-text-primary"><strong>Account Number:</strong> {giftEvent.bankAccount.accountNumber}</p>
                  <p className="text-text-primary"><strong>Bank:</strong> {giftEvent.bankAccount.bankName}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {giftEvent.allowMonetaryGifts && (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contribution Form */}
            <div className="bg-background-secondary border border-neutral-800 rounded-lg p-6">
              <h3 className="text-xl font-medium mb-6">Contribute Money Gift</h3>

            <form onSubmit={handleContributionSubmit} className="space-y-4">
              <div>
                <label className="block text-text-primary font-medium mb-2">Your Name</label>
                <input
                  type="text"
                  value={contributionForm.contributorName}
                  onChange={(e) => setContributionForm(prev => ({ ...prev, contributorName: e.target.value }))}
                  placeholder={user?.name || "Enter your name"}
                  className="w-full bg-background-tertiary border border-neutral-700 rounded-lg px-4 py-3 text-text-primary focus:border-neutral-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-text-primary font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={contributionForm.contributorEmail}
                  onChange={(e) => setContributionForm(prev => ({ ...prev, contributorEmail: e.target.value }))}
                  placeholder={user?.email || "your@email.com"}
                  className="w-full bg-background-tertiary border border-neutral-700 rounded-lg px-4 py-3 text-text-primary focus:border-neutral-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-text-primary font-medium mb-2">Contribution Amount (₦)</label>
                <input
                  type="number"
                  value={contributionForm.amount}
                  onChange={(e) => setContributionForm(prev => ({ ...prev, amount: e.target.value }))}
                  required
                  min="100"
                  placeholder="5000"
                  className="w-full bg-background-tertiary border border-neutral-700 rounded-lg px-4 py-3 text-text-primary focus:border-neutral-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-text-primary font-medium mb-2">Message (Optional)</label>
                <textarea
                  value={contributionForm.message}
                  onChange={(e) => setContributionForm(prev => ({ ...prev, message: e.target.value }))}
                  rows={3}
                  placeholder="Write a special message..."
                  className="w-full bg-background-tertiary border border-neutral-700 rounded-lg px-4 py-3 text-text-primary focus:border-neutral-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={contributionForm.isAnonymous}
                  onChange={(e) => setContributionForm(prev => ({ ...prev, isAnonymous: e.target.checked }))}
                  className="mr-3 rounded"
                />
                <label className="text-text-secondary text-sm">Contribute anonymously</label>
              </div>

              <button
                type="submit"
                disabled={contributionLoading || !contributionForm.amount}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-600 disabled:cursor-not-allowed text-white py-3 px-6 rounded-lg font-medium transition-colors"
              >
                {contributionLoading ? 'Processing...' : 'Contribute Now'}
              </button>
            </form>
          </div>

          {/* Contributors List */}
          <div className="bg-background-secondary border border-neutral-800 rounded-lg p-6">
            <h3 className="text-xl font-medium mb-6">Recent Contributors</h3>

            {contributions.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {contributions.map((contribution) => (
                  <div key={contribution.$id} className="bg-background-tertiary rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-text-primary">
                        {contribution.isAnonymous ? 'Anonymous' : contribution.contributorName}
                      </span>
                      <span className="text-blue-400 font-medium">
                        {formatCurrency(contribution.amount)}
                      </span>
                    </div>
                    {contribution.message && (
                      <p className="text-text-secondary text-sm italic">
                        "{contribution.message}"
                      </p>
                    )}
                    <p className="text-text-muted text-xs mt-2">
                      {new Date(contribution.$createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-text-muted">Be the first to contribute!</p>
              </div>
            )}
          </div>
          </div>
        )}

        {/* Share Section */}
        <div className="max-w-4xl mx-auto mt-12">
          <div className="bg-background-secondary border border-neutral-800 rounded-lg p-8 text-center">
            <h3 className="text-2xl font-medium mb-4">🎁 Share this Gift Event</h3>
            <p className="text-text-secondary mb-6">
              Invite friends and family to contribute to {giftEvent.recipientName}'s special {giftEvent.eventType}
            </p>

            {/* Copy Link Section */}
            <div className="bg-background-tertiary rounded-lg p-4 mb-6">
              <p className="text-text-muted text-sm mb-2">Share this link:</p>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={window.location.href}
                  readOnly
                  className="flex-1 bg-background-primary border border-neutral-700 rounded-lg px-3 py-2 text-text-primary text-sm"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Link copied to clipboard!');
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Social Share Buttons */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  const text = `🎉 Join me in celebrating ${giftEvent.recipientName}'s ${giftEvent.eventType}! ${window.location.href}`;
                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Share on Twitter
              </button>
              <button
                onClick={() => {
                  const text = `🎁 Help me celebrate ${giftEvent.recipientName}'s ${giftEvent.eventType}! Check out their gift wishlist: ${window.location.href}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Share on WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}