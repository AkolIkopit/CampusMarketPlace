import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const PaymentStatus = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const type = searchParams.get('type'); 
  const [processing, setProcessing] = useState(type === 'success');

  useEffect(() => {
    if (type === 'success') {
      finalizeOrder();
    }
  }, [type]);

  const finalizeOrder = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: items, error: cartError } = await supabase
        .from('cart_items')
        .select(`listing_id, listings(seller_id, price)`)
        .eq('user_id', user.id);

      if (cartError) throw cartError;

      if (items && items.length > 0) {
        const transactionRows = items.map(item => ({
          buyer_id: user.id,
          seller_id: item.listings.seller_id,
          listing_id: item.listing_id,
          amount: item.listings.price,
          status: 'paid'
        }));

        await supabase.from('transactions').insert(transactionRows);
        const listingIds = items.map(i => i.listing_id);
        await supabase.from('listings').update({ status: 'sold' }).in('id', listingIds);
        await supabase.from('cart_items').delete().eq('user_id', user.id);
      }
    } catch (err) {
      console.error("Order error:", err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main style={{height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', background:'#f0f4f8', position:'relative'}}>
       <section className="aurora-bg" aria-hidden="true"><hr className="orb orb-1" /><hr className="orb orb-2" /><hr className="orb orb-3" /></section>
       <article style={{background:'white', padding:'40px', borderRadius:'30px', textAlign:'center', position:'relative', zIndex:1, maxWidth:'400px', boxShadow:'0 15px 40px rgba(0,0,0,0.05)'}}>
          {processing ? (
            <>
              <Loader2 className="spinner" size={50} color="#003049" />
              <h2 style={{marginTop:'20px'}}>Finalizing Order...</h2>
            </>
          ) : type === 'success' ? (
            <>
              <CheckCircle size={70} color="#27ae60" />
              <h1 style={{color:'#0a192f', margin:'15px 0'}}>Success!</h1>
              <p>Your order is recorded. View details in your Profile history.</p>
              {/* FIX: Using replace: true to prevent history loops */}
              <button onClick={() => navigate('/dashboard/student', { replace: true })} style={{background:'#0a192f', color:'white', border:'none', padding:'12px 25px', borderRadius:'12px', fontWeight:'bold', cursor:'pointer', marginTop:'20px'}}>Dashboard</button>
            </>
          ) : (
            <>
              <XCircle size={70} color="#e63946" />
              <h1 style={{color:'#0a192f', margin:'20px 0'}}>Cancelled</h1>
              {/* FIX: Using replace: true to return to cart cleanly */}
              <button onClick={() => navigate('/cart', { replace: true })} style={{background:'#0a192f', color:'white', border:'none', padding:'12px 25px', borderRadius:'12px', fontWeight:'bold', cursor:'pointer'}}>Return to Cart</button>
            </>
          )}
       </article>
    </main>
  );
};

export default PaymentStatus;