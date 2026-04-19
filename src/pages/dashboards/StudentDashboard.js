import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../supabase';
import { 
  Plus, ShoppingBag, Box, MessageCircle, 
   Menu, X, User, LogOut, Filter, MapPin 
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
      } finally {
        setLoading(false); 
      }
    };
    fetchData();
  }, []);

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
      
      // FIX: Filter based on listing.location (the item campus) instead of seller profile campus
      if (selectedCampus !== 'all') {
        filtered = filtered.filter(i => i.location === selectedCampus);
      }
      setMarketListings(filtered);
    };
    fetchMarket();
  }, [selectedCat, selectedCampus, selectedCondition, minPrice, maxPrice]);
  

  useEffect(() => {
    const userId = profile?.id;
    if (!userId) { setUnreadMessageCount(0); return undefined; }
    let cancelled = false;

    const fetchUnreadMessageCount = async () => {
      const { count, error } = await supabase.from('messages').select('id', { count: 'exact', head: true }).eq('receiver_id', userId).eq('is_read', false);
      if (!error && !cancelled) setUnreadMessageCount(count || 0);
    };

    fetchUnreadMessageCount();
    const channel = supabase.channel(`dashboard-unreads-${userId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchUnreadMessageCount()).subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [profile?.id]);

  const setView = (newView) => {
    setSearchParams({ view: newView });
    setIsMenuOpen(false);
  };

  const handleSaveProfileSuccess = (updatedData) => {
    setProfile(prev => ({ ...prev, ...updatedData }));
    setView('profile');
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

      {view === 'profile' && <MyProfile profile={profile} onEditClick={() => setView('edit')} onBack={() => setView('market')} navigate={navigate} />}
      {view === 'edit' && <EditProfile profile={profile} onCancel={() => setView('profile')} onSaveSuccess={handleSaveProfileSuccess} />}
      
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
        {/* FIX: Shows listing.location (the item campus) instead of seller campus */}
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