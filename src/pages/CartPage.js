import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { ArrowLeft, Trash2, ShoppingBag, CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import './CartPage.css';

const CartPage = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // YOUR CREDENTIALS
  const MERCHANT_ID = '10048726'; 
  const MERCHANT_KEY = '7hpfi8jw92sau';

  useEffect(() => { fetchCart(); }, []);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('cart_items')
        .select(`id, listings(id, title, price, categories(name), listing_images(image_url), seller_id)`)
        .eq('user_id', user.id);

      if (error) throw error;
      setCartItems(data || []);
    } catch (err) {
      console.error("Cart error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (id) => {
    const { error } = await supabase.from('cart_items').delete().eq('id', id);
    if (!error) setCartItems(cartItems.filter(item => item.id !== id));
  };

  const subtotal = cartItems.reduce((acc, item) => acc + (item.listings?.price || 0), 0);

  const handleCheckout = () => {
    if (subtotal <= 0) return alert("Cart is empty.");

    const payfastData = {
      merchant_id: MERCHANT_ID,
      merchant_key: MERCHANT_KEY,
      return_url: `${window.location.origin}/payment-status?type=success`,
      cancel_url: `${window.location.origin}/payment-status?type=cancel`,
      amount: subtotal.toFixed(2),
      item_name: 'UniMart Purchase',
      email_address: 'sbtu01@payfast.co.za' 
    };

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://sandbox.payfast.co.za/eng/process'; 

    Object.keys(payfastData).forEach(key => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = payfastData[key];
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  };

  return (
    <main className="cart-page">
      <section className="aurora-bg" aria-hidden="true">
        <hr className="orb orb-1" /><hr className="orb orb-2" /><hr className="orb orb-3" />
      </section>
      
      <nav className="top-nav-bar">
        {/* FIX: Navigate to dashboard directly to break history loops */}
        <button className="back-btn" onClick={() => navigate('/dashboard/student')}>
          <ArrowLeft size={20} /> Continue Shopping
        </button>
      </nav>

      <header className="page-header">
        <h1>My Shopping Cart</h1>
        <p>{cartItems.length} items ready for checkout</p>
      </header>

      {loading ? (
        <figure className="loading-state-center"><Loader2 className="spinner" /> <h3>Syncing Cart...</h3></figure>
      ) : cartItems.length === 0 ? (
        <article className="empty-cart-view" style={{background: 'white', padding: '80px', borderRadius: '40px', textAlign: 'center', position: 'relative', zIndex: 1}}>
          <ShoppingBag size={80} color="#0a192f" />
          <h2>Your cart is empty.</h2>
          {/* Style fix: Added margin and cleaner button look */}
          <button 
            style={{background: '#0a192f', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '12px', marginTop: '20px', cursor: 'pointer', fontWeight: 'bold'}}
            onClick={() => navigate('/dashboard/student')}
          >
            Browse Items
          </button>
        </article>
      ) : (
        <section className="cart-content-layout">
          <section className="cart-items-column">
            {cartItems.map(item => (
              <article key={item.id} className="cart-item-card">
                <figure className="cart-item-image">
                  <img src={item.listings?.listing_images[0]?.image_url || '/placeholder.jpg'} alt="" />
                </figure>
                <section className="cart-item-details">
                  <mark className="item-category-tag">{item.listings?.categories.name}</mark>
                  <h3>{item.listings?.title}</h3>
                  <p className="item-price-text">R {item.listings?.price.toFixed(2)}</p>
                </section>
                <button className="cart-item-remove" onClick={() => removeItem(item.id)} title="Remove item">
                  <Trash2 size={20} />
                </button>
              </article>
            ))}
          </section>

          <aside className="cart-checkout-sidebar" style={{background: '#0a192f', color: 'white', padding: '40px', borderRadius: '35px', height: 'fit-content', position: 'sticky', top: '100px'}}>
            <header className="sidebar-header"><h3>Order Summary</h3></header>
            <nav className="summary-details" style={{display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px'}}>
              <article className="summary-row" style={{display: 'flex', justifyContent: 'space-between'}}><span>Subtotal</span><strong>R {subtotal.toFixed(2)}</strong></article>
              <article className="summary-row" style={{display: 'flex', justifyContent: 'space-between'}}><span>Trade Fee</span><strong style={{color: '#f3a91e'}}>FREE</strong></article>
              <hr style={{opacity: 0.1}} />
              <article className="summary-row total-row" style={{display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem'}}><strong style={{color: 'rgba(255,255,255,0.6)'}}>TOTAL</strong><strong style={{color: '#f3a91e', fontStyle: 'italic'}}>R {subtotal.toFixed(2)}</strong></article>
            </nav>
            <button className="proceed-btn" onClick={handleCheckout} style={{width: '100%', background: '#f3a91e', border: 'none', padding: '20px', borderRadius: '18px', fontWeight: '900', marginTop: '30px', cursor: 'pointer'}}>CHECKOUT</button>
            <footer style={{marginTop: '20px', opacity: 0.5, fontSize: '0.75rem', textAlign: 'center'}}><ShieldCheck size={14} style={{verticalAlign: 'middle', marginRight: '5px'}} /> PayFast Secure Payment</footer>
          </aside>
        </section>
      )}
    </main>
  );
};

export default CartPage;