import React, { useState, useEffect } from 'react';
import { 
  Phone, Star, ShieldCheck, Briefcase, Edit3, 
  MapPin, Send, ArrowLeft, Trash2, Clock, 
  User, IdCard, Loader2, Box, ShoppingCart, Package, Calendar, Plus
} from 'lucide-react';
import { supabase } from '../../supabase';
import LoadingScreen from '../../components/LoadingScreen';
import './MyProfile.css'; 

const MyProfile = ({ profile, onEditClick, onBack, navigate, onOpenRolePopup }) => {
  const [view, setView] = useState('profile'); 
  const [historyTab, setHistoryTab] = useState('orders');
  const [loading, setLoading] = useState(false);
  const [existingApp, setExistingApp] = useState(null);
  const [isFetchingApp, setIsFetchingApp] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [orderBookings, setOrderBookings] = useState([]);
  const paymentPendingStatuses = ['pending', 'pending_payment'];

  // --- CONSTANTS ---
  const campuses = ["Main Campus", "Education Campus", "Med Campus"];
  const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const [formData, setFormData] = useState({
    motivation: '', experience: '', campus_location: 'Main Campus', scenario_response: ''
  });

  // This state handles the Day + Start + End logic you asked for
  const [staffSchedule, setStaffSchedule] = useState({
    Monday: { available: false, start: "08:00", end: "16:00" },
    Tuesday: { available: false, start: "08:00", end: "16:00" },
    Wednesday: { available: false, start: "08:00", end: "16:00" },
    Thursday: { available: false, start: "08:00", end: "16:00" },
    Friday: { available: false, start: "08:00", end: "16:00" },
    Saturday: { available: false, start: "08:00", end: "16:00" },
    Sunday: { available: false, start: "08:00", end: "16:00" },
  });

  useEffect(() => {
    if (profile?.id) { 
      fetchApplication(); 
      fetchTransactions();
    }
  }, [profile?.id]);

  const fetchApplication = async () => {
    setIsFetchingApp(true);
    const { data } = await supabase.from('role_applications').select('*').eq('user_id', profile.id).maybeSingle();
    setExistingApp(data);
    setIsFetchingApp(false);
  };

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select(`*, listings(title, listing_images(image_url, is_primary))`)
      .order('created_at', { ascending: false });
    if (!error) setTransactions(data || []);

    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, transaction_id, listing_id, buyer_id, seller_id, status, collection_time, item_received, item_released, cash_shortfall')
      .or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`)
      .order('created_at', { ascending: false });

    if (!bookingsError) setOrderBookings(bookingsData || []);
  };

  const getOrderBooking = (transaction) => (
    orderBookings.find((booking) => booking.transaction_id === transaction.id) ||
    orderBookings.find((booking) => (
      booking.listing_id === transaction.listing_id &&
      booking.buyer_id === transaction.buyer_id &&
      booking.seller_id === transaction.seller_id
    ))
  );

  const isCollectionReady = (booking) => (
    booking?.status === 'ready_for_collection' ||
    booking?.status === 'item_received' ||
    booking?.item_received
  );

  const getOutstandingBalance = (transaction, booking) => {
    const transactionShortfall = transaction?.cash_shortfall_due;
    const bookingShortfall = booking?.cash_shortfall;
    const fallbackAmount = transaction?.agreed_amount ?? transaction?.amount ?? 0;
    return Number(transactionShortfall ?? bookingShortfall ?? fallbackAmount) || 0;
  };

  const isPaymentComplete = (transaction, booking) => (
    (transaction?.payment_status || '').toLowerCase() === 'fully_paid' ||
    getOutstandingBalance(transaction, booking) <= 0
  );

  const canBookCollection = (transaction, booking) => (
    isCollectionReady(booking) &&
    isPaymentComplete(transaction, booking) &&
    !booking.collection_time &&
    !booking.item_released
  );

  const hasBookedCollection = (booking) => (
    isCollectionReady(booking) &&
    Boolean(booking.collection_time) &&
    !booking.item_released
  );

  const formatCollectionTime = (collectionTime) => {
    if (!collectionTime) return '';
    return new Date(collectionTime).toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const isPaymentPending = (transaction, booking) => (
    paymentPendingStatuses.includes((transaction.payment_status || '').toLowerCase()) ||
    getOutstandingBalance(transaction, booking) > 0
  );

  const canOpenPayment = (transaction, booking) => {
    const bookingStatus = booking?.status || transaction.booking_status || '';
    const hasPaymentStageBooking = bookingStatus && !['not_booked', 'cancelled', 'expired'].includes(bookingStatus);

    return (
      transaction?.id &&
      transaction.buyer_id === profile.id &&
      isPaymentPending(transaction, booking) &&
      getOutstandingBalance(transaction, booking) > 0 &&
      hasPaymentStageBooking &&
      !['pending_seller_acceptance', 'declined_by_seller', 'cancelled', 'completed'].includes(transaction.status)
    );
  };

  const getDisplayAmount = (transaction) => (
    transaction.agreed_amount ?? transaction.amount ?? 0
  );

  const getItemStatus = (transaction, booking) => {
    const transactionStatus = transaction.status || '';
    const bookingStatus = booking?.status || transaction.booking_status || '';

    if (transactionStatus === 'declined_by_seller') return 'declined';
    if (transactionStatus === 'cancelled' || bookingStatus === 'cancelled') return 'cancelled';
    if (transactionStatus === 'completed' || booking?.item_released) return 'completed';
    if (isCollectionReady(booking) && !isPaymentComplete(transaction, booking)) return 'pay remaining balance';
    if (isPaymentPending(transaction, booking) && bookingStatus && !['not_booked', 'cancelled', 'expired'].includes(bookingStatus)) return 'pending payment';
    if (isCollectionReady(booking) && booking?.collection_time) return 'collection booked';
    if (isCollectionReady(booking)) return 'awaiting buyer collection';
    if (bookingStatus === 'requested') return 'facility booking requested';
    if (bookingStatus === 'confirmed') return 'facility booking confirmed';
    if (transactionStatus === 'accepted_pending_booking' || transactionStatus === 'pending_booking') return 'awaiting seller booking';
    if (transactionStatus === 'pending_seller_acceptance' || transactionStatus === 'pending') return 'awaiting seller acceptance';
    if (transactionStatus === 'sold') return 'sold';

    return transactionStatus || 'pending';
  };

  const openCollectionBooking = (transaction, booking) => {
    const query = new URLSearchParams({
      mode: 'collection',
      booking: booking.id,
      listing: transaction.listing_id,
      seller: transaction.seller_id,
      buyer: profile.id,
      transaction: transaction.id,
      item: transaction.listings?.title || 'Listing',
      name: 'Seller',
    });

    navigate(`/bookings/new?${query.toString()}`);
  };

  const openPayment = (transaction) => {
    navigate(`/transactions/${transaction.id}/payment`);
  };

  const submitApplication = async (e, role) => {
    e.preventDefault();
    setLoading(true);

    // Prepare availability: only send the days they are actually 'available'
    const finalAvailability = role === 'staff' ? staffSchedule : { general: "Admin Application" };

    const { error } = await supabase.from('role_applications').insert([{
      user_id: profile.id, 
      full_name: profile.full_name, 
      requested_role: role, 
      motivation: formData.motivation,
      experience: formData.experience,
      campus_location: formData.campus_location,
      scenario_response: formData.scenario_response,
      availability: finalAvailability, // This is now a JSON object!
      status: 'pending'
    }]);

    if (!error) { 
      alert("Application submitted successfully!"); 
      setView('profile'); 
      fetchApplication(); 
    } else { 
      alert(error.message); 
    }
    setLoading(false);
  };

  const withdrawApplication = async () => {
    if (!window.confirm("Withdraw application?")) return;
    setLoading(true);
    await supabase.from('role_applications').delete().eq('user_id', profile.id);
    setExistingApp(null);
    setLoading(false);
  };

  if (!profile || isFetchingApp) return <LoadingScreen />;

  const myOrders = transactions.filter(t => t.buyer_id === profile.id);
  const mySales = transactions.filter(t => t.seller_id === profile.id);

  // --- SUB-VIEW: APPLICATION FORM ---
  if (view === 'apply_staff' || view === 'apply_admin') {
    const isStaff = view === 'apply_staff';
    return (
      <section className="profile-view-section">
        <article className="application-form-card" style={{background: '#0d1b2a', border: '2px solid #f0a500', padding: '40px', borderRadius: '30px', maxWidth: '700px', margin: '0 auto'}}>
          <header className="form-header">
            <button onClick={() => setView('profile')} className="back-link-btn" style={{color: '#f0a500', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'}}><ArrowLeft size={16} /> Back</button>
            <h2 style={{color: '#f0a500', marginTop: '15px'}}>{isStaff ? 'Staff Application' : 'Admin Application'}</h2>
          </header>

          <form onSubmit={(e) => submitApplication(e, isStaff ? 'staff' : 'admin')} className="application-main-form">
            
            <div className="form-group" style={{marginBottom: '20px'}}>
                <label style={{color: 'white', fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>Assigned Campus</label>
                <select 
                    value={formData.campus_location}
                    onChange={(e) => setFormData({...formData, campus_location: e.target.value})}
                    style={{width: '100%', padding: '12px', borderRadius: '12px', background: '#F7F3EC', color: '#0d1b2a', fontWeight: 'bold', border: 'none'}}
                >
                    {campuses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            <div className="form-group" style={{marginBottom: '20px'}}>
                <label style={{color: 'white', fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>{isStaff ? "Brief Experience" : "Motivation"}</label>
                <textarea 
                    required 
                    onChange={(e) => setFormData({...formData, [isStaff ? 'experience' : 'motivation']: e.target.value})} 
                    style={{width: '100%', padding: '12px', borderRadius: '12px', border: 'none', background: '#F7F3EC', color: '#0d1b2a', fontWeight: 'bold'}}
                />
            </div>

            {isStaff ? (
                <div className="availability-selector">
                    <label style={{color: '#f0a500', fontWeight: '900', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '15px', display: 'block'}}>
                      Set Your Available Shifts:
                    </label>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                        {weekdays.map(day => (
                            <div key={day} style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '15px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '15px'}}>
                                <label style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'white', minWidth: '110px', cursor: 'pointer', fontWeight: 'bold'}}>
                                    <input 
                                        type="checkbox" 
                                        checked={staffSchedule[day].available}
                                        onChange={(e) => setStaffSchedule({...staffSchedule, [day]: {...staffSchedule[day], available: e.target.checked}})}
                                    />
                                    {day}
                                </label>
                                
                                {staffSchedule[day].available && (
                                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                        <div style={{display: 'flex', flexDirection: 'column'}}>
                                            <span style={{fontSize: '9px', color: '#f0a500', fontWeight: 'bold'}}>START</span>
                                            <input type="time" value={staffSchedule[day].start} onChange={(e) => setStaffSchedule({...staffSchedule, [day]: {...staffSchedule[day], start: e.target.value}})} style={{padding: '5px', borderRadius: '5px', border: 'none', background: '#F7F3EC', color: '#0d1b2a', fontWeight: 'bold'}} />
                                        </div>
                                        <span style={{color: 'white', marginTop: '10px'}}>—</span>
                                        <div style={{display: 'flex', flexDirection: 'column'}}>
                                            <span style={{fontSize: '9px', color: '#f0a500', fontWeight: 'bold'}}>END</span>
                                            <input type="time" value={staffSchedule[day].end} onChange={(e) => setStaffSchedule({...staffSchedule, [day]: {...staffSchedule[day], end: e.target.value}})} style={{padding: '5px', borderRadius: '5px', border: 'none', background: '#F7F3EC', color: '#0d1b2a', fontWeight: 'bold'}} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="form-group">
                    <label style={{color: 'white', fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>General Availability</label>
                    <input 
                        required placeholder="e.g. Mon-Fri"
                        onChange={(e) => setFormData({...formData, availability: e.target.value})} 
                        style={{width: '100%', padding: '12px', borderRadius: '12px', border: 'none', background: '#F7F3EC', color: '#0d1b2a', fontWeight: 'bold'}}
                    />
                </div>
            )}

            <button type="submit" className="post-btn" style={{marginTop: '30px', padding: '18px', fontSize: '1.4rem'}} disabled={loading}>
                {loading ? <Loader2 className="spinner" /> : "SUBMIT APPLICATION"}
            </button>
          </form>
        </article>
      </section>
    );
  }

  // --- MAIN VIEW: PROFILE ---
  return (
    <main className="mp-container">
      <article className="mp-card">
        <nav className="profile-top-nav">
          <button className="back-btn" onClick={onBack} style={{background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#0a192f'}}>
            <ArrowLeft size={18} /> Back to Dashboard
          </button>
        </nav>

        <figure className="profile-avatar-wrap" style={{display: 'flex', justifyContent: 'center'}}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="mp-avatar-large" />
          ) : (
            <User size={100} className="mp-avatar-large" style={{padding: '20px', background: '#f0f4f8', color: '#003049'}} />
          )}
        </figure>

        <h1 className="mp-name">{profile.full_name}</h1>
        
        {existingApp?.status === 'pending' && (
          <mark className="mp-status-banner">
            <nav className="mp-status-text">
              <Clock size={16} />
              <p>Pending <strong>{existingApp.requested_role}</strong> Application</p>
            </nav>
            <button className="mp-withdraw-btn" onClick={withdrawApplication} disabled={loading}>
              <Trash2 size={14} /> Withdraw
            </button>
          </mark>
        )}

        <p className="mp-student-id">Student ID: {profile.student_number || 'Not Set'}</p>
        
        <nav className="mp-contact-info" style={{display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '20px', color: '#0d1b2a', fontWeight: 'bold'}}>
          <p style={{display: 'flex', alignItems: 'center', gap: '5px'}}><Phone size={14} /> {profile.phone_number || 'No contact'}</p>
          <p style={{display: 'flex', alignItems: 'center', gap: '5px'}}><MapPin size={14} /> {profile.campus || 'Main Campus'}</p>
        </nav>

        <p className="mp-bio" style={{color: '#444'}}>{profile.bio || "No bio yet."}</p>

        <section className="mp-action-group">
          <button className="mp-btn" onClick={() => navigate('/my-listings')} style={{background: '#0d1b2a', color: '#f0a500'}}>
            <Box size={20} /> My Listings
          </button>
          <button className="mp-btn" onClick={() => setView('apply_staff')} disabled={loading || existingApp} style={{background: '#0d1b2a', color: '#f0a500'}}>
            <Briefcase size={20} /> Apply Staff
          </button>
          <button className="mp-btn" onClick={() => setView('apply_admin')} disabled={loading || existingApp} style={{background: '#0d1b2a', color: '#f0a500'}}>
            <ShieldCheck size={20} /> Apply Admin
          </button>
          <button className="mp-btn" onClick={onEditClick} style={{background: '#f0a500', color: '#0d1b2a'}}>
            <Edit3 size={18} /> Edit Profile
          </button>
        </section>

        {existingApp?.status === 'approved' && (
          <aside className="claim-role-banner" onClick={onOpenRolePopup} style={{marginTop: '30px', background: '#e8f5e9', border: '2px solid #27ae60', borderRadius: '15px', padding: '15px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <nav style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
               <ShieldCheck color="#27ae60" />
               <p style={{margin: 0, color: '#1b5e20', fontWeight: 'bold'}}>Upgrade Approved! Click to activate.</p>
            </nav>
            <button style={{background: '#27ae60', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', fontWeight: 'bold'}}>Activate</button>
          </aside>
        )}
      </article>

      {/* --- TRANSACTION HISTORY SECTION --- */}
      <section className="history-section" style={{marginTop: '40px'}}>
        <header className="section-header">
           <h2 style={{borderLeft: '6px solid #f0a500', paddingLeft: '15px', color: '#0d1b2a'}}>Activity History</h2>
        </header>
        <nav className="history-tabs" style={{display: 'flex', gap: '10px', margin: '20px 0', borderBottom: '1px solid #eee', paddingBottom: '10px'}}>
          <button className={historyTab === 'orders' ? 'active-tab' : ''} onClick={() => setHistoryTab('orders')} style={{background: historyTab === 'orders' ? '#0d1b2a' : 'none', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', color: historyTab === 'orders' ? '#f0a500' : '#999', cursor: 'pointer'}}>My Orders</button>
          <button className={historyTab === 'sales' ? 'active-tab' : ''} onClick={() => setHistoryTab('sales')} style={{background: historyTab === 'sales' ? '#0d1b2a' : 'none', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', color: historyTab === 'sales' ? '#f0a500' : '#999', cursor: 'pointer'}}>My Sales</button>
        </nav>

        <ul className="history-list" style={{listStyle: 'none', padding: 0}}>
          {(historyTab === 'orders' ? myOrders : mySales).map(t => {
            const booking = getOrderBooking(t);
            const collectionReady = historyTab === 'orders' && canBookCollection(t, booking);
            const collectionBooked = historyTab === 'orders' && hasBookedCollection(booking);
            const itemStatus = getItemStatus(t, booking);
            const showPaymentButton = canOpenPayment(t, booking);

            return (
              <li key={t.id} className="history-item">
                {(() => {
                  const primaryImage = t.listings?.listing_images?.find((img) => img.is_primary) || t.listings?.listing_images?.[0];
                  return <img src={primaryImage?.image_url || '/placeholder.jpg'} alt="" className="history-item-image" />;
                })()}
                <nav className="history-item-main">
                  <strong>{t.listings?.title}</strong>
                  <time>{new Date(t.created_at).toLocaleDateString()}</time>
                  {collectionReady ? (
                    <p className="collection-ready-note">Ready for collection at the trade facility.</p>
                  ) : null}
                  {collectionBooked ? (
                    <p className="collection-booked-note">
                      Collection booked for {formatCollectionTime(booking.collection_time)}.
                    </p>
                  ) : null}
                </nav>
                <aside className="history-item-side">
                  <p>R {getDisplayAmount(t)}</p>
                  <mark>{itemStatus}</mark>
                  {showPaymentButton ? (
                    <button
                      type="button"
                      className="payment-route-btn"
                      onClick={() => openPayment(t)}
                    >
                      Make payment
                    </button>
                  ) : null}
                  {collectionReady ? (
                    <button
                      type="button"
                      className="collection-slot-btn"
                      onClick={() => openCollectionBooking(t, booking)}
                    >
                      <Calendar size={16} /> Book collection slot
                    </button>
                  ) : null}
                </aside>
              </li>
            );
          })}
          {(historyTab === 'orders' ? myOrders : mySales).length === 0 && <p style={{textAlign: 'center', color: '#ccc', padding: '40px'}}>No {historyTab} found.</p>}
        </ul>
      </section>
    </main>
  );
};

export default MyProfile;
