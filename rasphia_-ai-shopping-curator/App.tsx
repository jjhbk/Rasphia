
import React, { useState, useCallback } from 'react';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import LandingPage from './components/LandingPage';
import CheckoutPage from './components/CheckoutPage';
import ProfilePage from './components/ProfilePage';
import ReviewModal from './components/ReviewModal';
import { getCuratedResponse } from './services/geminiService';
import type { Message, Product, Order, CheckoutCustomer, UserProfile, Review } from './types';
import { addOrder } from './data/orders';
import { products as initialProducts } from './data/products';
import ProfileIcon from './components/icons/ProfileIcon';


const initialMessage: Message = {
  author: 'ai',
  text: "Hello, I'm Rasphia. I blend taste with thought to help you find the perfect gift or perfume. Who is this for, and what's the occasion?",
};

const initialUser: UserProfile = {
  name: '',
  email: '',
  phone: '',
  address: '',
  wishlist: [],
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(initialUser);
  const [reviewingOrder, setReviewingOrder] = useState<Order | null>(null);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = { author: 'user', text };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Pass the current state of products to the service
      const aiResponse = await getCuratedResponse([...messages, userMessage], products);
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error fetching AI response:', error);
      const errorMessage: Message = {
        author: 'ai',
        text: 'I apologize, but I seem to be having trouble connecting. Please try again in a moment.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, products]);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setMessages([initialMessage]); // Reset chat
    setCheckoutProduct(null);
    setOrders([]);
    setCurrentUser(initialUser);
    setIsProfileVisible(false);
    setProducts(initialProducts); // Reset product data
  };

  const handleInitiateCheckout = (product: Product) => {
    setCheckoutProduct(product);
  };

  const handleCancelCheckout = () => {
    setCheckoutProduct(null);
  };

  const handlePlaceOrder = (customer: CheckoutCustomer, paymentId: string) => {
    if (!checkoutProduct) return;
    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      customer,
      product: checkoutProduct,
      paymentId,
      date: new Date().toISOString(),
      status: 'Processing',
      isReviewed: false,
    };
    addOrder(newOrder);
    setOrders(prev => [...prev, newOrder]);
    
    // Simulate order status updates
    setTimeout(() => {
        setOrders(prevOrders => prevOrders.map(o => 
            o.id === newOrder.id ? { ...o, status: 'Shipped', trackingNumber: `RS${Math.floor(100000000 + Math.random() * 900000000)}` } : o
        ));
    }, 5000); // Shipped after 5 seconds

    setTimeout(() => {
        setOrders(prevOrders => prevOrders.map(o => 
            o.id === newOrder.id ? { ...o, status: 'Delivered' } : o
        ));
    }, 12000); // Delivered after 12 seconds


    // Update user profile with latest details if they've changed
    setCurrentUser(prev => ({
      ...prev,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address
    }));

    setCheckoutProduct(null);
    
    // Optional: Send a confirmation message in chat
    const confirmationMessage: Message = {
      author: 'ai',
      text: `Thank you for your purchase of ${checkoutProduct.name}! Your order ID is ${newOrder.id}. We'll notify you once it ships. You can track its status in your profile.`,
    };
    setMessages(prev => [...prev, confirmationMessage]);
  };

  const handleToggleWishlist = (product: Product) => {
    setCurrentUser(prevUser => {
        const isInWishlist = prevUser.wishlist.some(item => item.name === product.name);
        if (isInWishlist) {
            return {
                ...prevUser,
                wishlist: prevUser.wishlist.filter(item => item.name !== product.name)
            };
        } else {
            return {
                ...prevUser,
                wishlist: [...prevUser.wishlist, product]
            };
        }
    });
  };

  const handleShowProfile = () => setIsProfileVisible(true);
  const handleHideProfile = () => setIsProfileVisible(false);
  const handleSaveProfile = (updatedProfile: UserProfile) => {
    setCurrentUser(updatedProfile);
    handleHideProfile();
  };
  
  const handleStartReview = (order: Order) => {
    setReviewingOrder(order);
  };

  const handleCloseReview = () => {
    setReviewingOrder(null);
  };

  const handleAddReview = (orderId: string, rating: number, comment: string) => {
    const orderToReview = orders.find(o => o.id === orderId);
    if (!orderToReview) return;
    
    const newReview: Review = {
        authorName: currentUser.name || "Anonymous",
        rating,
        comment,
        date: new Date().toISOString()
    };
    
    // Update the product in the main products list
    setProducts(prevProducts => prevProducts.map(p => 
        p.name === orderToReview.product.name 
            ? { ...p, reviews: [...p.reviews, newReview] }
            : p
    ));
    
    // Mark the order as reviewed
    setOrders(prevOrders => prevOrders.map(o =>
        o.id === orderId ? { ...o, isReviewed: true } : o
    ));

    handleCloseReview();
  };

  if (!isAuthenticated) {
    return <LandingPage onLogin={handleLogin} />;
  }

  if (isProfileVisible) {
    return <ProfilePage 
              user={currentUser} 
              orders={orders} 
              onSave={handleSaveProfile} 
              onBack={handleHideProfile}
              onInitiateCheckout={handleInitiateCheckout}
              onToggleWishlist={handleToggleWishlist}
              onStartReview={handleStartReview}
            />;
  }

  if (checkoutProduct) {
    return <CheckoutPage product={checkoutProduct} user={currentUser} onPlaceOrder={handlePlaceOrder} onCancel={handleCancelCheckout} />;
  }

  return (
    <div className="flex flex-col h-screen bg-stone-100 text-stone-800 font-sans">
      <header className="p-4 flex justify-between items-center border-b border-stone-200 bg-white">
        <button 
            onClick={handleLogout}
            className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
            Sign Out
        </button>
        <div className="text-center">
            <h1 className="text-2xl font-serif text-amber-900 tracking-wider">Rasphia</h1>
            <p className="text-sm text-stone-500">The Art of Thoughtful Gifting</p>
        </div>
        <button 
            onClick={handleShowProfile}
            className="text-stone-500 hover:text-stone-800 transition-colors"
            aria-label="View Profile"
        >
            <ProfileIcon />
        </button>
      </header>
      <main className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
          <ChatWindow 
            messages={messages} 
            isLoading={isLoading} 
            onInitiateCheckout={handleInitiateCheckout}
            wishlist={currentUser.wishlist}
            onToggleWishlist={handleToggleWishlist}
            products={products}
          />
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </main>
      {reviewingOrder && (
        <ReviewModal 
            order={reviewingOrder}
            onClose={handleCloseReview}
            onSubmit={handleAddReview}
        />
      )}
    </div>
  );
};

export default App;