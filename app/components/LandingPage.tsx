import React from 'react';
import GoogleIcon from './icons/GoogleIcon';
import ChatIcon from './icons/ChatIcon';
import GiftIcon from './icons/GiftIcon';
import SparkleIcon from './icons/SparkleIcon';

interface LandingPageProps {
  onLogin: () => void;
}

const testimonials = [
    {
        quote: "Rasphia helped me find a last-minute anniversary gift that was so personal and thoughtful. My wife was speechless! I'll never scroll endlessly again.",
        author: "Rohan S.",
    },
    {
        quote: "As someone who's very particular about fragrances, I was skeptical. But the AI understood the 'vibe' I wanted perfectly. I've found my new signature scent.",
        author: "Anjali M.",
    }
];

const productImages = [
    'https://picsum.photos/seed/p1/600/600',
    'https://picsum.photos/seed/p2/600/600',
    'https://picsum.photos/seed/p3/600/600',
    'https://picsum.photos/seed/p4/600/600',
];

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  return (
    <div className="bg-[#FDFBF7] text-amber-900 font-sans">
      {/* Hero Section */}
      <header className="relative flex flex-col items-center justify-center h-screen min-h-[600px] p-8 text-center text-white">
        <div className="absolute inset-0 bg-black opacity-40"></div>
        <img src="https://picsum.photos/seed/hero-bg/1920/1080" alt="Luxury gifts background" className="absolute inset-0 object-cover w-full h-full" />
        <div className="relative z-10">
          <h1 className="text-6xl md:text-8xl font-serif tracking-wider mb-4">Rasphia</h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-12">
            Discover meaningful gifts and signature perfumes through a conversation, not a search bar.
          </p>
          <button
            onClick={onLogin}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-white border border-stone-200 rounded-full shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1 text-stone-700 font-medium"
          >
            <GoogleIcon />
            <span>Begin Your Discovery</span>
          </button>
        </div>
      </header>

      <main>
        {/* How It Works Section */}
        <section className="py-20 px-8 bg-white">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-4xl font-serif text-amber-900 mb-4">A More Thoughtful Way to Shop</h2>
            <p className="text-stone-600 mb-12 max-w-2xl mx-auto">Skip the endless scrolling. Describe your vision, and let our AI curator find items with soul.</p>
            <div className="grid md:grid-cols-3 gap-12 text-left">
              <div className="flex flex-col items-center text-center">
                <div className="bg-amber-100 p-4 rounded-full mb-4">
                  <ChatIcon />
                </div>
                <h3 className="text-xl font-semibold mb-2">1. Share Your Intent</h3>
                <p className="text-stone-500">Tell us about the person, the occasion, or the feeling you want to capture.</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="bg-amber-100 p-4 rounded-full mb-4">
                  <GiftIcon />
                </div>
                <h3 className="text-xl font-semibold mb-2">2. Receive Curated Ideas</h3>
                <p className="text-stone-500">Rasphia presents a few thoughtful recommendations, complete with their stories.</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="bg-amber-100 p-4 rounded-full mb-4">
                  <SparkleIcon />
                </div>
                <h3 className="text-xl font-semibold mb-2">3. Discover the Perfect Match</h3>
                <p className="text-stone-500">Compare options and find a gift that truly resonates and delights.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Product Showcase */}
        <section className="py-20 px-8">
            <div className="max-w-5xl mx-auto text-center">
                <h2 className="text-4xl font-serif text-amber-900 mb-12">Find Gifts That Resonate</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {productImages.map((src, index) => (
                        <div key={index} className="aspect-square overflow-hidden rounded-lg shadow-lg">
                            <img src={src} alt={`Curated product ${index + 1}`} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20 px-8 bg-amber-50/50">
            <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-4xl font-serif text-amber-900 mb-12">Why People Love Rasphia</h2>
                <div className="space-y-10">
                    {testimonials.map((testimonial, index) => (
                        <div key={index}>
                            <p className="text-lg italic text-stone-700 mb-4">"{testimonial.quote}"</p>
                            <p className="font-semibold text-amber-800">- {testimonial.author}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-stone-800 text-stone-300 py-12 px-8">
        <div className="max-w-5xl mx-auto text-center">
            <h3 className="text-3xl font-serif text-white mb-4">Rasphia</h3>
            <p className="text-stone-400 mb-6">Where Taste Meets Thought.</p>
            <div className="flex justify-center space-x-6 text-sm">
                <a href="#" className="hover:text-white transition-colors">About Us</a>
                <a href="#" className="hover:text-white transition-colors">For Brands</a>
                <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
             <p className="text-xs text-stone-500 mt-10">&copy; {new Date().getFullYear()} Rasphia. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;