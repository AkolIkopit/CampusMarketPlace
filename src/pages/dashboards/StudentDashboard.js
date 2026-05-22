import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../supabase';
import {
  Plus, ShoppingBag, Box, MessageCircle,
  Menu, X, User, LogOut, Filter, MapPin, Search,
  PartyPopper, Loader2, OctagonX, Clock
} from 'lucide-react';
import { notifyError } from '../../toast';
import MyProfile from './MyProfile';
import EditProfile from './EditProfile';
import LoadingScreen from '../../components/LoadingScreen';
import './StudentDashboard.css';
import BuyerPopup from "./BuyerPopup";
import Seller_Popup from "./Seller_Popup";
import ReviewPromptPopup from "./ReviewPromptPopup";

const logoSrc = `${process.env.PUBLIC_URL || ''}/UniMartlogo.png`;

const StudentDashboard = ({ profile: initialProfile }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // URL Persistence: Refreshing keeps you on the same view
  const view = searchParams.get('view') || 'market';
  
  const [profile, setProfile] = useState(initialProfile);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [recentListings, setRecentListings] = useState([]);
  const [marketListings, setMarketListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  // Role Popup States
  const [approvedApp, setApprovedApp] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter & Search panels (mobile drawers)
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Filter States
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedCampus, setSelectedCampus] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [listingSearch, setListingSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Search is applied on explicit submit (Search button) or clear.

  const campusOptions = ["Main Campus", "Education Campus", "Med Campus"];
  const conditionOptions = ["New", "Like New", "Good", "Fair", "Poor"];

  useEffect(() => {
    if (!profile?.id) return;

    const fetchData = async () => {
      try {
        const { data: catData } = await supabase.from('categories').select('*');
        setCategories(catData || []);

        const { data: recent } = await supabase
          .from('listings')
          .select(`*, profiles:seller_id(full_name, avatar_url, campus), categories(name), listing_images(image_url, is_primary)`)
          .in('status', ['active', 'sold_out'])
          .order('created_at', { ascending: false })
          .limit(10);
        setRecentListings(recent || []);

        await checkApprovalStatus();
      } finally {
        setLoading(false); 
      }
    };
    fetchData();
  }, [profile?.id]);

  const checkApprovalStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('role_applications').select('*').eq('user_id', user.id).eq('status', 'approved').maybeSingle();
    if (data && !sessionStorage.getItem('skipRolePopup')) setShowPopup(true);
    setApprovedApp(data);
  };

  const handleAcceptRole = async () => {
    setIsProcessing(true);
    try {
      const targetRole = approvedApp.requested_role;
      await supabase.from('profiles').update({ role: targetRole }).eq('id', approvedApp.user_id);
      await supabase.from('role_applications').update({ status: 'completed' }).eq('id', approvedApp.id);
      window.location.href = targetRole === 'admin' ? '/dashboard/admin' : '/dashboard/staff';
    } catch (err) { notifyError(err.message); setIsProcessing(false); }
  };

  useEffect(() => {
    if (!profile?.id) return;

    const fetchMarket = async () => {
      let query = supabase.from('listings').select(`*, profiles:seller_id(full_name, avatar_url, campus), categories(name), listing_images(image_url, is_primary)`).in('status', ['active', 'sold_out']);
      if (selectedCat !== 'all') query = query.eq('category_id', selectedCat);
      if (selectedCondition !== 'all') query = query.eq('condition', selectedCondition);
      if (minPrice) query = query.gte('price', Number(minPrice));
      if (maxPrice) query = query.lte('price', Number(maxPrice));

      const { data } = await query.order('created_at', { ascending: false });
      let filtered = data || [];
      if (selectedCampus !== 'all') filtered = filtered.filter(i => i.location === selectedCampus);
      setMarketListings(filtered);
    };
    fetchMarket();
  }, [profile?.id, selectedCat, selectedCampus, selectedCondition, minPrice, maxPrice]);

  useEffect(() => {
    const userId = profile?.id;
    if (!userId) return;

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('is_read', false);
      setUnreadMessageCount(count || 0);
    };

    fetchUnread();

    const channel = supabase.channel?.(`unread-messages-${userId}`);
    const subscribedChannel = channel
      ?.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newRow = payload.new;
          if (!newRow) return;
          if (newRow.receiver_id === userId && newRow.is_read === false) {
            setUnreadMessageCount((current) => current + 1);
          }
        }
      )
      ?.on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const newRow = payload.new;
          const oldRow = payload.old;
          if (!newRow || !oldRow) return;

          if (newRow.receiver_id === userId) {
            if (oldRow.is_read === false && newRow.is_read === true) {
              setUnreadMessageCount((current) => Math.max(0, current - 1));
            }
            if (oldRow.is_read === true && newRow.is_read === false) {
              setUnreadMessageCount((current) => current + 1);
            }
          }
        }
      )
      ?.subscribe();

    return () => {
      const removeTarget = subscribedChannel ?? channel;
      if (removeTarget && supabase.removeChannel) {
        supabase.removeChannel(removeTarget);
      }
    };
  }, [profile?.id]);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredRecentListings = recentListings;
  const filteredMarketListings = normalizedSearch
    ? marketListings.filter((item) => item.title?.toLowerCase() === normalizedSearch)
    : marketListings;

  const setView = (newV) => { setSearchParams({ view: newV }); setIsMenuOpen(false); };

  if (loading && !profile) return <LoadingScreen />;

  return (
   

    <main className="dashboard-container">

      <section className="aurora-bg" aria-hidden="true"><hr className="orb orb-1" /><hr className="orb orb-2" /><hr className="orb orb-3" /></section>
      
      <header className="main-header">
        <nav className="header-nav">
          <section className="logo-section" onClick={() => setView('market')}>
            <img src={logoSrc} alt="UniMart logo" className="header-logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <h1 className="logo-text">UniMart</h1>
          </section>
          <nav className="header-actions">
            {view === 'market' && (
              <>
                <button
                  className="icon-btn search-toggle-btn"
                  onClick={() => { setIsSearchOpen(o => !o); setIsFilterOpen(false); setIsMenuOpen(false); }}
                  aria-label="Toggle search"
                  aria-expanded={isSearchOpen}
                >
                  {isSearchOpen ? <X size={20} /> : <Search size={20} />}
                </button>
                <button
                  className="icon-btn filter-toggle-btn"
                  onClick={() => { setIsFilterOpen(o => !o); setIsSearchOpen(false); setIsMenuOpen(false); }}
                  aria-label="Toggle filters"
                  aria-expanded={isFilterOpen}
                >
                  {isFilterOpen ? <X size={20} /> : <Filter size={20} />}
                </button>
              </>
            )}
            <button className="icon-btn" onClick={() => { setIsMenuOpen(!isMenuOpen); setIsFilterOpen(false); setIsSearchOpen(false); }}>{isMenuOpen ? <X size={24} /> : <Menu size={24} />}</button>
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

      {/* --- VIEWS --- */}
      {view === 'profile' && <MyProfile profile={profile} onEditClick={() => setView('edit')} onBack={() => setView('market')} navigate={navigate} onOpenRolePopup={() => setShowPopup(true)} />}
      {view === 'edit' && <EditProfile profile={profile} onCancel={() => setView('profile')} onSaveSuccess={(d) => { setProfile({...profile, ...d}); setView('profile'); }} />}
      
      {view === 'market' && (
        <>
          <section className="hero-section">
            <header className="hero-content">
              <mark className="hero-kicker">WELCOME BACK, {profile?.full_name?.split(' ')[0].toUpperCase()}</mark>
              <h2 className="hero-title gold-text">Your campus marketplace is alive.</h2>
              <p className="hero-description white-text">Trade securely with verified university students from all campuses.</p>
            </header>
          </section>

          {/* GRID OF 3 (REMOVED REDUNDANT PROFILE BUTTON) */}
          <section className="quick-actions-grid">
            <article className="action-block" onClick={() => navigate('/my-listings')}><figure className="block-icon"><Box size={24} /></figure><h3>My Listings</h3></article>
            <article className="action-block" onClick={() => navigate('/messages')}>
              <figure className="block-icon"><MessageCircle size={24} /></figure>
              <nav className="action-title-row"><h3>My Messages</h3>{unreadMessageCount > 0 && <mark className="message-count-badge">{unreadMessageCount}</mark>}</nav>
            </article>
          </section>

          <section className="feed-outer-section">
            <header className="section-header"><h2>Recent Listings (Top 10)</h2></header>
            <section className="listings-grid-layout">
              {filteredRecentListings.length > 0 ? filteredRecentListings.map(item => <ListingCard key={item.id} item={item} />) : <p className="empty-msg">No recent listings available.</p>}
            </section>
          </section>

          <form className={`search-ribbon${isSearchOpen ? ' search-open' : ''}`} onSubmit={(e) => { e.preventDefault(); setSearchQuery(listingSearch); setIsSearchOpen(false); }}>
            <div className="search-bar-inner">
              <input
                type="text"
                className="search-input"
                value={listingSearch}
                onChange={(e) => setListingSearch(e.target.value)}
                placeholder="Search listings by name"
              />
              {listingSearch && (
                <button type="button" className="search-clear" aria-label="Clear search" onClick={() => { setListingSearch(''); setSearchQuery(''); setIsSearchOpen(false); }}>
                  ×
                </button>
              )}
            </div>
            <button type="submit" className="search-button">Search</button>
          </form>

          <section className="market-layout">
            <aside className={`filter-sidebar${isFilterOpen ? ' filter-open' : ''}`}>
              <header className="sidebar-header"><Filter size={18} /><h3>Filters</h3></header>
              <form className="filter-form">
                <fieldset className="filter-group"><legend>Campus</legend><select value={selectedCampus} onChange={(e) => setSelectedCampus(e.target.value)}><option value="all">All Campuses</option>{campusOptions.map(c => <option key={c} value={c}>{c}</option>)}</select></fieldset>
                <fieldset className="filter-group"><legend>Condition</legend><select value={selectedCondition} onChange={(e) => setSelectedCondition(e.target.value)}><option value="all">Any Condition</option>{conditionOptions.map(c => <option key={c} value={c}>{c}</option>)}</select></fieldset>
                <fieldset className="filter-group">
                   <legend>Price Range (R)</legend>
                   <input type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
                   <input type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
                </fieldset>
                <fieldset className="filter-group"><legend>Category</legend><select value={selectedCat} onChange={(e) => setSelectedCat(e.target.value)}><option value="all">All</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></fieldset>
                <button type="button" className="reset-btn" onClick={() => { setSelectedCat('all'); setSelectedCampus('all'); setSelectedCondition('all'); setMinPrice(''); setMaxPrice(''); setIsFilterOpen(false); }}>Clear Filters</button>
              </form>
            </aside>
            <section className="market-results">
              <header className="section-header"><h2>Market Feed</h2></header>
              <section className="listings-grid-layout">{filteredMarketListings.length > 0 ? filteredMarketListings.map(item => <ListingCard key={item.id} item={item} />) : <p className="empty-msg">{normalizedSearch ? 'No items match your search.' : 'No items found.'}</p>}</section>
            </section>
          </section>
        </>
      )}

      {view === 'market' && <button className="create-post-fab" onClick={() => navigate('/create-listing')}><Plus size={28} /><label>Create Post</label></button>}

      {showPopup && approvedApp && (
        <aside className="role-popup-overlay" style={{position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(10px)'}}>
          <article className="role-popup-card" style={{background: '#0d1b2a', padding: '40px', borderRadius: '30px', textAlign: 'center', maxWidth: '450px', width: '90%', border: '2px solid #f0a500'}}>
            <PartyPopper size={50} color="#f0a500" style={{marginBottom: '20px'}} />
            <h2 style={{color: '#f0a500'}}>Accept Job as {approvedApp.requested_role.toUpperCase()}</h2>
            <nav style={{display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '30px'}}>
                <button onClick={handleAcceptRole} disabled={isProcessing} style={{background: '#f0a500', color: '#0d1b2a', padding: '16px', borderRadius: '12px', border: 'none', fontWeight: '900', cursor: 'pointer'}}>ACCEPT & ACTIVATE</button>
                <button onClick={() => setShowPopup(false)} style={{background: 'none', border: 'none', color: 'white', marginTop: '10px', cursor: 'pointer'}}>LATER</button>
            </nav>
          </article>
        </aside>
      )}
      <BuyerPopup userId={profile?.id} />
      <Seller_Popup userId={profile?.id} />
      <ReviewPromptPopup userId={profile?.id} />
    </main>
  );
};

const ListingCard = ({ item }) => {
  const navigate = useNavigate();
  const primaryImage = item.listing_images?.find((img) => img.is_primary) || item.listing_images?.[0];
  const isSoldOut = item.status === 'sold_out';
  return (
    <article className={`listing-card-item${isSoldOut ? ' listing-card-sold-out' : ''}`} onClick={() => navigate(`/listing/${item.id}`)}>
      <header className="listing-card-top">
        <figure className="listing-img-container">
          <img
            src={primaryImage?.image_url || '/placeholder.jpg'}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', display: 'block' }}
          />
        </figure>
        {isSoldOut && <span className="sold-out-overlay-badge">SOLD OUT</span>}
        <section className="seller-mini-info">
          {item.profiles?.avatar_url ? <img src={item.profiles.avatar_url} alt="" className="mini-avatar" /> : <User size={12} style={{color: '#f3a91e'}} />}
          <p>{item.profiles?.full_name || 'Student'}</p>
        </section>
        <section className="campus-badge"><MapPin size={10} /><p>{item.location || 'Main'}</p></section>
      </header>
      <footer className="listing-card-bottom">
        <section className="listing-info-main"><h4>{item.title}</h4><mark className="category-tag">{item.categories?.name}</mark><p className="condition-tag">{item.condition}</p></section>
        <p className="listing-price">R {item.price}</p>
      </footer>
    </article>
  );
};

export default StudentDashboard;
