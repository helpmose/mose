"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from "@/components/layout/header";
import { useAuthStore } from '@/store/auth-store';
import { GiftService } from '@/lib/services/gifts';
import { ProductService } from '@/lib/services/product';
import { UserService } from '@/lib/services/user';
import { GIFT_PRIVACY } from '@/lib/constants';

export default function CreateGiftPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [giftType, setGiftType] = useState<'wishlist' | 'monetary' | 'both'>('wishlist');
  const [formData, setFormData] = useState({
    recipientName: '',
    recipientEmail: '',
    eventType: 'birthday',
    eventDate: '',
    title: '',
    description: '',
    giftGoal: '',
    theme: 'birthday',
    privacy: GIFT_PRIVACY.PUBLIC,
    allowMessages: true,
    allowPhotos: true,
    allowPlaylist: true,
    sendReminders: true,
    allowMonetaryGifts: false,
    bankAccountName: '',
    bankAccountNumber: '',
    bankName: '',
    // Delivery address fields
    firstName: '',
    lastName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    phoneNumber: ''
  });

  useEffect(() => {
    loadProducts();
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadProducts = async () => {
    try {
      const result = await ProductService.getProducts({ status: 'active', limit: 50 });
      setProducts(result.products);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadUserProfile = async () => {
    if (!user) return;
    try {
      const profile = await UserService.getProfile(user.$id);
      setUserProfile(profile);

      // Pre-populate basic fields if available
      if (profile) {
        setFormData(prev => ({
          ...prev,
          firstName: profile.displayName?.split(' ')[0] || '',
          lastName: profile.displayName?.split(' ')[1] || '',
          phoneNumber: profile.phone || ''
        }));
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in to create a gift event');
      return;
    }

    if (giftType === 'wishlist' && selectedProducts.length === 0) {
      alert('Please select at least one product for your wishlist');
      return;
    }

    if ((giftType === 'wishlist' || giftType === 'both') && !formData.addressLine1) {
      alert('Please provide a delivery address for wishlist items');
      return;
    }

    if ((giftType === 'monetary' || giftType === 'both') && !formData.bankAccountNumber) {
      alert('Please provide bank account details for monetary gifts');
      return;
    }

    setLoading(true);
    try {
      const deliveryAddress = (giftType === 'wishlist' || giftType === 'both') ? {
        firstName: formData.firstName,
        lastName: formData.lastName,
        addressLine1: formData.addressLine1,
        addressLine2: formData.addressLine2,
        city: formData.city,
        state: formData.state,
        postalCode: formData.postalCode,
        country: 'Nigeria',
        phoneNumber: formData.phoneNumber
      } : undefined;

      const bankAccount = (giftType === 'monetary' || giftType === 'both') ? {
        accountName: formData.bankAccountName,
        accountNumber: formData.bankAccountNumber,
        bankName: formData.bankName
      } : undefined;

      const giftEvent = await GiftService.createGiftEvent({
        creatorId: user.$id,
        recipientName: formData.recipientName,
        recipientEmail: formData.recipientEmail || undefined,
        eventType: formData.eventType,
        eventDate: formData.eventDate,
        title: formData.title,
        description: formData.description || undefined,
        theme: formData.theme,
        privacy: formData.privacy,
        giftGoal: formData.giftGoal ? parseFloat(formData.giftGoal) : undefined,
        wishlistProducts: giftType !== 'monetary' ? selectedProducts : undefined,
        deliveryAddress,
        bankAccount,
        allowMonetaryGifts: giftType === 'monetary' || giftType === 'both',
        settings: {
          allowMessages: formData.allowMessages,
          allowPhotos: formData.allowPhotos,
          allowPlaylist: formData.allowPlaylist,
          sendReminders: formData.sendReminders
        }
      });

      console.log('✅ Gift event created, navigating to:', giftEvent.$id);
      alert('Gift event created successfully!');
      router.push(`/gift/${giftEvent.$id}`);
    } catch (error) {
      console.error('Error creating gift event:', error);
      alert('Failed to create gift event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <Header />

      <div className="container mx-auto px-4 pt-32 pb-16">
        <div className="mb-12">
          <h1 className="text-4xl md:text-6xl font-serif font-light mb-4 tracking-wide text-text-primary">
            Create Gift Event
          </h1>
          <p className="text-xl text-text-muted font-light max-w-2xl">
            Create a gift event for any occasion - friends and family can contribute gifts or money
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Gift Type Selection */}
            <div className="bg-background-secondary border border-neutral-800 rounded-lg p-6">
              <h3 className="text-xl font-medium mb-6">Choose Gift Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key: 'wishlist', title: 'Product Wishlist', desc: 'Let friends buy specific items from marketplace' },
                  { key: 'monetary', title: 'Monetary Gifts', desc: 'Receive money directly to your bank account' },
                  { key: 'both', title: 'Both Options', desc: 'Allow both product purchases and money gifts' }
                ].map((type) => (
                  <button
                    key={type.key}
                    type="button"
                    onClick={() => setGiftType(type.key as any)}
                    className={`p-4 rounded-lg border transition-colors text-left ${
                      giftType === type.key
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-neutral-700 hover:border-neutral-600'
                    }`}
                  >
                    <h4 className="font-medium text-text-primary mb-2">{type.title}</h4>
                    <p className="text-sm text-text-muted">{type.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Event Details Form */}
              <div className="space-y-6">
                <h3 className="text-xl font-medium">Event Details</h3>

                <div>
                <label className="block text-text-primary font-medium mb-2">Recipient Name*</label>
                <input
                  type="text"
                  name="recipientName"
                  value={formData.recipientName}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-background-secondary border border-neutral-700 rounded-lg px-4 py-3 text-text-primary focus:border-neutral-600 focus:outline-none"
                  placeholder="Who is this gift for?"
                />
              </div>

              <div>
                <label className="block text-text-primary font-medium mb-2">Recipient Email</label>
                <input
                  type="email"
                  name="recipientEmail"
                  value={formData.recipientEmail}
                  onChange={handleInputChange}
                  className="w-full bg-background-secondary border border-neutral-700 rounded-lg px-4 py-3 text-text-primary focus:border-neutral-600 focus:outline-none"
                  placeholder="optional@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-primary font-medium mb-2">Event Type*</label>
                  <select
                    name="eventType"
                    value={formData.eventType}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-background-secondary border border-neutral-700 rounded-lg px-4 py-3 text-text-primary focus:border-neutral-600 focus:outline-none"
                  >
                    <option value="birthday">Birthday</option>
                    <option value="anniversary">Anniversary</option>
                    <option value="wedding">Wedding</option>
                    <option value="graduation">Graduation</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-text-primary font-medium mb-2">Event Date*</label>
                  <input
                    type="date"
                    name="eventDate"
                    value={formData.eventDate}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-background-secondary border border-neutral-700 rounded-lg px-4 py-3 text-text-primary focus:border-neutral-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-text-primary font-medium mb-2">Event Title*</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-background-secondary border border-neutral-700 rounded-lg px-4 py-3 text-text-primary focus:border-neutral-600 focus:outline-none"
                  placeholder="e.g., Sarah's 25th Birthday"
                />
              </div>

              <div>
                <label className="block text-text-primary font-medium mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full bg-background-secondary border border-neutral-700 rounded-lg px-4 py-3 text-text-primary focus:border-neutral-600 focus:outline-none"
                  placeholder="Tell contributors about this special occasion..."
                />
              </div>

              {(giftType === 'monetary' || giftType === 'both') && (
                <div>
                  <label className="block text-text-primary font-medium mb-2">Gift Goal (₦)</label>
                  <input
                    type="number"
                    name="giftGoal"
                    value={formData.giftGoal}
                    onChange={handleInputChange}
                    min="1000"
                    className="w-full bg-background-secondary border border-neutral-700 rounded-lg px-4 py-3 text-text-primary focus:border-neutral-600 focus:outline-none"
                    placeholder="50000"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-primary font-medium mb-2">Theme</label>
                  <select
                    name="theme"
                    value={formData.theme}
                    onChange={handleInputChange}
                    className="w-full bg-background-secondary border border-neutral-700 rounded-lg px-4 py-3 text-text-primary focus:border-neutral-600 focus:outline-none"
                  >
                    <option value="birthday">Birthday</option>
                    <option value="celebration">Celebration</option>
                    <option value="elegant">Elegant</option>
                    <option value="modern">Modern</option>
                  </select>
                </div>

                <div>
                  <label className="block text-text-primary font-medium mb-2">Privacy</label>
                  <select
                    name="privacy"
                    value={formData.privacy}
                    onChange={handleInputChange}
                    className="w-full bg-background-secondary border border-neutral-700 rounded-lg px-4 py-3 text-text-primary focus:border-neutral-600 focus:outline-none"
                  >
                    <option value={GIFT_PRIVACY.PUBLIC}>Public</option>
                    <option value={GIFT_PRIVACY.PRIVATE}>Private</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-text-primary font-medium">Gift Platform Features</label>
                <div className="space-y-2">
                  {[
                    { name: 'allowMessages', label: 'Allow Messages' },
                    { name: 'allowPhotos', label: 'Allow Photo/Video Upload' },
                    { name: 'allowPlaylist', label: 'Allow Spotify Playlist' },
                    { name: 'sendReminders', label: 'Send Reminders' }
                  ].map((feature) => (
                    <label key={feature.name} className="flex items-center">
                      <input
                        type="checkbox"
                        name={feature.name}
                        checked={formData[feature.name as keyof typeof formData] as boolean}
                        onChange={handleInputChange}
                        className="mr-3 rounded"
                      />
                      <span className="text-text-secondary">{feature.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Bank Account Details */}
              {(giftType === 'monetary' || giftType === 'both') && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Bank Account Details</h4>
                  <div>
                    <label className="block text-text-primary font-medium mb-2">Account Name*</label>
                    <input
                      type="text"
                      name="bankAccountName"
                      value={formData.bankAccountName}
                      onChange={handleInputChange}
                      required={giftType === 'monetary' || giftType === 'both'}
                      className="w-full bg-background-secondary border border-neutral-700 rounded-lg px-4 py-3 text-text-primary focus:border-neutral-600 focus:outline-none"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-text-primary font-medium mb-2">Account Number*</label>
                      <input
                        type="text"
                        name="bankAccountNumber"
                        value={formData.bankAccountNumber}
                        onChange={handleInputChange}
                        required={giftType === 'monetary' || giftType === 'both'}
                        className="w-full bg-background-secondary border border-neutral-700 rounded-lg px-4 py-3 text-text-primary focus:border-neutral-600 focus:outline-none"
                        placeholder="1234567890"
                      />
                    </div>
                    <div>
                      <label className="block text-text-primary font-medium mb-2">Bank Name*</label>
                      <input
                        type="text"
                        name="bankName"
                        value={formData.bankName}
                        onChange={handleInputChange}
                        required={giftType === 'monetary' || giftType === 'both'}
                        className="w-full bg-background-secondary border border-neutral-700 rounded-lg px-4 py-3 text-text-primary focus:border-neutral-600 focus:outline-none"
                        placeholder="Access Bank"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery Address - only for wishlist gifts */}
              {(giftType === 'wishlist' || giftType === 'both') && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Delivery Address</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-text-primary font-medium mb-2">First Name*</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required={giftType === 'wishlist' || giftType === 'both'}
                        className="w-full bg-background-secondary border border-neutral-700 rounded-lg px-4 py-3 text-text-primary focus:border-neutral-600 focus:outline-none"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label className="block text-text-primary font-medium mb-2">Last Name*</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required={giftType === 'wishlist' || giftType === 'both'}
                        className="w-full bg-background-secondary border border-neutral-700 rounded-lg px-4 py-3 text-text-primary focus:border-neutral-600 focus:outline-none"
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-text-primary font-medium mb-2">Address Line 1*</label>
                    <input
                      type="text"
                      name="addressLine1"
                      value={formData.addressLine1}
                      onChange={handleInputChange}
                      required={giftType === 'wishlist' || giftType === 'both'}
                      className="w-full bg-background-secondary border border-neutral-700 rounded-lg px-4 py-3 text-text-primary focus:border-neutral-600 focus:outline-none"
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div>
                    <label className="block text-text-primary font-medium mb-2">Address Line 2</label>
                    <input
                      type="text"
                      name="addressLine2"
                      value={formData.addressLine2}
                      onChange={handleInputChange}
                      className="w-full bg-background-secondary border border-neutral-700 rounded-lg px-4 py-3 text-text-primary focus:border-neutral-600 focus:outline-none"
                      placeholder="Apartment, suite, etc."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-text-primary font-medium mb-2">City*</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required={giftType === 'wishlist' || giftType === 'both'}
                        className="w-full bg-background-secondary border border-neutral-700 rounded-lg px-4 py-3 text-text-primary focus:border-neutral-600 focus:outline-none"
                        placeholder="Lagos"
                      />
                    </div>
                    <div>
                      <label className="block text-text-primary font-medium mb-2">State*</label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        required={giftType === 'wishlist' || giftType === 'both'}
                        className="w-full bg-background-secondary border border-neutral-700 rounded-lg px-4 py-3 text-text-primary focus:border-neutral-600 focus:outline-none"
                        placeholder="Lagos"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-text-primary font-medium mb-2">Postal Code</label>
                      <input
                        type="text"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleInputChange}
                        className="w-full bg-background-secondary border border-neutral-700 rounded-lg px-4 py-3 text-text-primary focus:border-neutral-600 focus:outline-none"
                        placeholder="100001"
                      />
                    </div>
                    <div>
                      <label className="block text-text-primary font-medium mb-2">Phone Number*</label>
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        required={giftType === 'wishlist' || giftType === 'both'}
                        className="w-full bg-background-secondary border border-neutral-700 rounded-lg px-4 py-3 text-text-primary focus:border-neutral-600 focus:outline-none"
                        placeholder="+234 800 000 0000"
                      />
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>


            {/* Product Wishlist Selection */}
            {(giftType === 'wishlist' || giftType === 'both') && (
              <div className="bg-background-secondary border border-neutral-800 rounded-lg p-8">
                <h3 className="text-xl font-medium mb-6">Select Products for Wishlist</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {products.map((product) => (
                    <div
                      key={product.$id}
                      onClick={() => toggleProductSelection(product.$id)}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedProducts.includes(product.$id)
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-neutral-700 hover:border-neutral-600'
                      }`}
                    >
                      <div className="aspect-square bg-background-tertiary rounded-lg mb-3 overflow-hidden">
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
                      <h4 className="font-medium text-text-primary text-sm mb-1 line-clamp-2">
                        {product.title}
                      </h4>
                      <p className="text-blue-400 font-medium text-sm">
                        ₦{product.price?.toLocaleString()}
                      </p>
                      {selectedProducts.includes(product.$id) && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-500 text-white">
                            ✓ Selected
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {selectedProducts.length > 0 && (
                  <div className="mt-4 p-4 bg-background-tertiary rounded-lg">
                    <p className="text-text-secondary text-sm">
                      Selected {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''} for your wishlist
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="text-center">
              <button
                type="submit"
                disabled={loading || !formData.recipientName || !formData.title || !formData.eventDate ||
                  (giftType === 'wishlist' && selectedProducts.length === 0) ||
                  ((giftType === 'wishlist' || giftType === 'both') && !formData.addressLine1) ||
                  ((giftType === 'monetary' || giftType === 'both') && !formData.bankAccountNumber)}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-600 disabled:cursor-not-allowed text-white py-3 px-8 rounded-lg font-medium transition-colors"
              >
                {loading ? 'Creating...' : 'Create Gift Event'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 