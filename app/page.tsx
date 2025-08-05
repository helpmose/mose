"use client";

import Header from "@/components/layout/header";
import BecomeSellerButton from "@/components/ui/become-seller-button";
import ShopCollectionButton from "@/components/ui/shop-collection-button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-8">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-5xl md:text-7xl font-serif font-light mb-6 tracking-wide">
              MOSÉ
            </h1>
            <p className="text-xl md:text-2xl text-text-muted font-light max-w-3xl mx-auto leading-relaxed">
              Discover authentic African art and handcrafted gifts from talented artisans across the continent
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 justify-center mb-10">
            <ShopCollectionButton className="px-8 py-3 text-lg">
              SHOP COLLECTION
            </ShopCollectionButton>
            <BecomeSellerButton 
              variant="outline"
              className="px-8 py-3 text-lg"
            >
              BECOME A SELLER
            </BecomeSellerButton>
          </div>
        </div>
      </section>

      {/* Featured Products Grid */}
      <section className="py-16 border-t border-neutral-800">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { id: 1, image: "/u9499386881_African_art_and_handcrafted_gifts_from_talented_a_2cba438a-0a36-4d5b-b78a-cb10d524b2b4_0.png" },
              { id: 2, image: "/u9499386881_African_art_and_handcrafted_gifts_from_talented_a_2cba438a-0a36-4d5b-b78a-cb10d524b2b4_1.png" },
              { id: 3, image: "/u9499386881_African_art_and_handcrafted_gifts_from_talented_a_2cba438a-0a36-4d5b-b78a-cb10d524b2b4_2.png" },
              { id: 4, image: "/u9499386881_African_art_and_handcrafted_gifts_from_talented_a_2cba438a-0a36-4d5b-b78a-cb10d524b2b4_3.png" }
            ].map((item) => (
              <div key={item.id} className="group">
                <div className="aspect-square bg-background-secondary mb-4 relative overflow-hidden border border-neutral-800">
                  <div className="absolute top-4 left-4 bg-red-500 text-white px-2 py-1 text-sm font-medium z-10">
                    SALE
                  </div>
                  <img 
                    src={item.image} 
                    alt="African art and handcrafted gifts" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <h3 className="text-lg font-medium mb-2">African Mask Collection</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-text-muted line-through">₦25,000</span>
                  <span className="text-text-primary font-medium">₦15,000</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-16 border-t border-neutral-800">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-2xl mb-2">🛡️</div>
              <h3 className="font-medium mb-1 text-text-primary">Authenticity Guaranteed</h3>
              <p className="text-text-muted text-sm">Verified artisan creations</p>
            </div>
            <div>
              <div className="text-2xl mb-2">🚚</div>
              <h3 className="font-medium mb-1 text-text-primary">Free Shipping</h3>
              <p className="text-text-muted text-sm">On orders over ₦50,000</p>
            </div>
            <div>
              <div className="text-2xl mb-2">↩️</div>
              <h3 className="font-medium mb-1 text-text-primary">Easy Returns</h3>
              <p className="text-text-muted text-sm">30-day return policy</p>
            </div>
            <div>
              <div className="text-2xl mb-2">💬</div>
              <h3 className="font-medium mb-1 text-text-primary">24/7 Support</h3>
              <p className="text-text-muted text-sm">Expert customer care</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
