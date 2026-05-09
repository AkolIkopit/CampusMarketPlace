import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../supabase';
import { 
  Plus, ShoppingBag, Box, MessageCircle, 
   Menu, X, User, LogOut, Filter, MapPin,
   PartyPopper, Loader2, OctagonX, Clock
} from 'lucide-react';
import MyProfile from './MyProfile';
import EditProfile from './EditProfile';
import LoadingScreen from '../../components/LoadingScreen';
import './StudentDashboard.css';

const StudentDashboard = ({ profile: initialProfile }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const view = searchParams.get('view') || 'market';
  
  const [profile, setProfile] = useState(initialProfile);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [recentListings, setRecentListings] = useState([]);
  const [marketListings, setMarketListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  // --- ROLE POPUP STATES ---
  const [approvedApp, setApprovedApp] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedCampus, setSelectedCampus] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const campusOptions = ["Main Campus", "Education Campus", "Med Campus"];
  const conditionOptions = ["New", "Like New", "Good", "Fair", "Poor"];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: catData } = await supabase.from('categories').select('*');
        setCategories(catData || []);

        const { data: recent } = await supabase
          .from('listings')
          .select(`*, profiles:seller_id(full_name, avatar_url), categories(name), listing_images(image_url)`)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(10);
        setRecentListings(recent || []);

        // CHECK FOR ROLE APPROVAL
        await checkApprovalStatus();

      } finally {
        setLoading(false); 
      }
    };
    fetchData();
  }, []);

  const checkApprovalStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('role_applications')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .maybeSingle();

    if (data) {
      setApprovedApp(data);
      if (!sessionStorage.getItem('skipRolePopup')) {
        setShowPopup(true);
      }
    }
  };

  const handleAcceptRole = async () => {
    setIsProcessing(true);
    try {
      const targetRole = approvedApp.requested_role;
      await supabase.from('profiles').update({ role: targetRole }).eq('id', approvedApp.user_id);
      await supabase.from('role_applications').update({ status: 'completed' }).eq('id', approvedApp.id);
      sessionStorage.removeItem('skipRolePopup');
      window.location.href = targetRole === 'admin' ? '/dashboard/admin' : '/dashboard/staff';
    } catch (err) {
      alert("Error: " + err.message);
      setIsProcessing(false);
    }
  };

  const handleRejectRole = async () => {
    if (!window.confirm("Permanently decline this upgrade?")) return;
    setIsProcessing(true);
    await supabase.from('role_applications').delete().eq('id', approvedApp.id);
    setShowPopup(false);
    setIsProcessing(false);
    window.location.reload(); 
  };

  const handleLater = () => {
    sessionStorage.setItem('skipRolePopup', 'true');
    setShowPopup(false);
  };

  useEffect(() => {
    const fetchMarket = async () => {
      let query = supabase
        .from('listings')
        .select(`*, profiles:seller_id(full_name, avatar_url), categories(name), listing_images(image_url)`)
        .eq('status', 'active');

      if (selectedCat !== 'all') query = query.eq('category_id', selectedCat);
      if (selectedCondition !== 'all') query = query.eq('condition', selectedCondition);
      if (minPrice) query = query.gte('price', Number(minPrice));
      if (maxPrice) query = query.lte('price', Number(maxPrice));

      const { data } = await query.order('created_at', { ascending: false });
      let filtered = data || [];
      if (selectedCampus !== 'all') {
        filtered = filtered.filter(i => i.location === selectedCampus);
      }
      setMarketListings(filtered);
    };
    fetchMarket();
  }, [selectedCat, selectedCampus, selectedCondition, minPrice, maxPrice]);
  

  useEffect(() => {
    const userId = profile?.id;
    if (!userId) return;
    const fetchUnread = async () => {
      const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true }).eq('receiver_id', userId).eq('is_read', false);
      setUnreadMessageCount(count || 0);
    };
    fetchUnread();
  }, [profile?.id]);

  const setView = (newView) => {
    setSearchParams({ view: newView });
    setIsMenuOpen(false);
  };

  if (loading && !profile) return <LoadingScreen />;

  return (
    <main className="dashboard-container">
      <section className="aurora-bg" aria-hidden="true"><hr className="orb orb-1" /><hr className="orb orb-2" /><hr className="orb orb-3" /></section>
      
      <header className="main-header">
        <nav className="header-nav">
          <section className="logo-section" onClick={() => setView('market')}>
            <img src="/UniMartlogo.png" alt="Logo" className="header-logo" /><h1 className="logo-text">UniMart</h1>
          </section>
          <nav className="header-actions">
            <button className="icon-btn" onClick={() => navigate('/cart')}><ShoppingBag size={20} /></button>
            <button className="icon-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>{isMenuOpen ? <X size={24} /> : <Menu size={24} />}</button>
          </nav>
        </nav>
      </header>

      {isMenuOpen && (
        <aside className="burger-menu">
          <ul className="menu-list">
            <li><button onClick={() => setView('profile')}><User size={18} /> My Profile</button></li>
            <li><button onClick={async () => { await supabase.auth.signOut(); navigate('/'); }} className="logout-action-btn"><LogOut size={18} /> Logout</button></li>
          </ul>
        </aside>
      )}

      {view === 'profile' && <MyProfile profile={profile} onEditClick={() => setView('edit')} onBack={() => setView('market')} navigate={navigate} onOpenRolePopup={() => setShowPopup(true)} />}
      {view === 'edit' && <EditProfile profile={profile} onCancel={() => setView('profile')} onSaveSuccess={(d) => { setProfile({...profile, ...d}); setView('profile'); }} />}
      
      {view === 'market' && (
        <>
          <section className="hero-section">
            <header className="hero-content">
              <mark className="hero-kicker white-text">WELCOME BACK, {profile?.full_name?.split(' ')[0].toUpperCase()}</mark>
              <h2 className="hero-title gold-text">Your campus marketplace is alive.</h2>
              <p className="hero-description white-text">Trade securely with verified university students from all campuses.</p>
            </header>
          </section>

          <section className="quick-actions-grid">
            <article className="action-block" onClick={() => navigate('/my-listings')}><figure className="block-icon"><Box size={24} /></figure><h3>My Listings</h3></article>
            <article className="action-block" onClick={() => navigate('/messages')}>
              <figure className="block-icon"><MessageCircle size={24} /></figure>
              <nav className="action-title-row">
                <h3>My Messages</h3>
                {unreadMessageCount > 0 && <mark className="message-count-badge">{unreadMessageCount}</mark>}
              </nav>
            </article>
            <article className="action-block" onClick={() => setView('profile')}><figure className="block-icon"><User size={24} /></figure><h3>My Profile</h3></article>
          </section>

          <section className="feed-outer-section">
            <header className="section-header"><h2>Recent Listings (Top 10)</h2></header>
            <section className="listings-grid-layout">{recentListings.map(item => <ListingCard key={item.id} item={item} />)}</section>
          </section>

          <section className="market-layout">
            <aside className="filter-sidebar">
              <header className="sidebar-header"><Filter size={18} /><h3>Filters</h3></header>
              <form className="filter-form">
                <fieldset className="filter-group"><legend>Campus</legend>
                  <select value={selectedCampus} onChange={(e) => setSelectedCampus(e.target.value)}>
                    <option value="all">All Campuses</option>
                    {campusOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </fieldset>
                <fieldset className="filter-group"><legend>Condition</legend>
                  <select value={selectedCondition} onChange={(e) => setSelectedCondition(e.target.value)}>
                    <option value="all">Any Condition</option>
                    {conditionOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </fieldset>
                <fieldset className="filter-group">
                   <legend>Price Range (R)</legend>
                   <input type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
                   <input type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
                </fieldset>
                <fieldset className="filter-group"><legend>Category</legend>
                  <select value={selectedCat} onChange={(e) => setSelectedCat(e.target.value)}>
                    <option value="all">All</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </fieldset>
                <button type="button" className="reset-btn" onClick={() => { setSelectedCat('all'); setSelectedCampus('all'); setSelectedCondition('all'); setMinPrice(''); setMaxPrice(''); }}>Clear Filters</button>
              </form>
            </aside>
            <section className="market-results">
              <header className="section-header"><h2>Market Feed</h2></header>
              <section className="listings-grid-layout">
                {marketListings.length > 0 ? marketListings.map(item => <ListingCard key={item.id} item={item} />) : <p className="empty-msg">No items found.</p>}
              </section>
            </section>
          </section>
        </>
      )}

      {view === 'market' && <button className="create-post-fab" onClick={() => navigate('/create-listing')}><Plus size={28} /><label>Create Post</label></button>}

      {/* --- ROLE ACCEPTANCE POPUP (NAVY & ORANGE THEME) --- */}
      {showPopup && approvedApp && (
        <div className="role-popup-overlay" style={{position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(10px)'}}>
          <div className="role-popup-card" style={{background: '#0d1b2a', padding: '40px', borderRadius: '30px', textAlign: 'center', maxWidth: '450px', width: '90%', border: '2px solid #f0a500', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'}}>
            <div className="confetti-icon" style={{marginBottom: '20px'}}><PartyPopper size={50} color="#f0a500" /></div>
            
            <h2 style={{color: '#f0a500', fontSize: '24px', marginBottom: '15px'}}>Accept your new job as {approvedApp.requested_role.toUpperCase()}</h2>
            
            <p style={{color: '#F7F3EC', opacity: 0.9, marginBottom: '30px', fontSize: '16px'}}>You have been handpicked to join the UniMart management team.</p>
            
            <div className="popup-options-vertical" style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                <button 
                  onClick={handleAcceptRole} 
                  disabled={isProcessing} 
                  style={{background: '#f0a500', color: '#0d1b2a', padding: '16px', borderRadius: '12px', border: 'none', fontWeight: '900', fontSize: '16px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px'}}
                >
                    {isProcessing ? <Loader2 className="spinner" /> : "Accept & Activate Now"}
                </button>
                
                <div style={{display: 'flex', gap: '10px'}}>
                    <button 
                      onClick={handleLater} 
                      disabled={isProcessing}
                      style={{flex: 1, padding: '12px', background: 'rgba(247, 243, 236, 0.1)', color: '#F7F3EC', border: '1px solid rgba(247, 243, 236, 0.3)', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}
                    >
                        <Clock size={16} /> Later
                    </button>
                    <button 
                      onClick={handleRejectRole} 
                      disabled={isProcessing}
                      style={{flex: 1, padding: '12px', background: 'rgba(230, 57, 70, 0.1)', color: '#e63946', border: '1px solid #e63946', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}
                    >
                        <OctagonX size={16} /> Decline
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

const ListingCard = ({ item }) => {
  const navigate = useNavigate();
  return (
    <article className="listing-card-item" onClick={() => navigate(`/listing/${item.id}`)}>
      <header className="listing-card-top">
        <figure className="listing-img-container"><img src={item.listing_images?.[0]?.image_url || '/placeholder.jpg'} alt="" /></figure>
        <section className="seller-mini-info">
          {item.profiles?.avatar_url ? <img src={item.profiles.avatar_url} alt="" className="mini-avatar" /> : <User size={12} style={{color: '#f3a91e'}} />}
          <p>{item.profiles?.full_name || 'Student'}</p>
        </section>
        <section className="campus-badge"><MapPin size={10} /><p>{item.location || 'Main Campus'}</p></section>
      </header>
      <footer className="listing-card-bottom">
        <section className="listing-info-main"><h4>{item.title}</h4><mark className="category-tag">{item.categories?.name}</mark><p className="condition-tag">{item.condition}</p></section>
        <p className="listing-price">R {item.price}</p>
      </footer>
    </article>
  );
};

export default StudentDashboard;