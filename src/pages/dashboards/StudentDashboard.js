import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { 
  Plus, ShoppingBag, Box, MessageCircle, 
  Search, Menu, X, User, Settings, LogOut, Filter, MapPin 
} from 'lucide-react';

// Import our sub-components
import MyProfile from './MyProfile';
import EditProfile from './EditProfile';
import './StudentDashboard.css';

const StudentDashboard = ({ profile: initialProfile }) => {
  const navigate = useNavigate();
  
  // --- VIEW NAVIGATION STATE ---
  // Possible views: 'market', 'profile', 'edit'
  const [view, setView] = useState('market'); 
  const [profile, setProfile] = useState(initialProfile);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // --- DATA STATES ---
  const [recentListings, setRecentListings] = useState([]);
  const [marketListings, setMarketListings] = useState([]);
  const [categories, setCategories] = useState([]);

  // --- FILTER STATES ---
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedCampus, setSelectedCampus] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const campusOptions = ["Main Campus", "Education Campus", "Med Campus"];

  // --- FETCH INITIAL DATA (Categories & Recent) ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: catData } = await supabase.from('categories').select('*');
        setCategories(catData || []);

        const { data: recent } = await supabase
          .from('listings')
          .select(`*, profiles:seller_id (full_name, avatar_url, campus), categories(name), listing_images(image_url)`)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(4);
        setRecentListings(recent || []);
      } catch (err) {
        console.error("Fetch Error:", err.message);
      }
    };
    fetchData();
  }, []);

  // --- FETCH MARKET DATA (Whenever filters change) ---
  useEffect(() => {
    const fetchMarket = async () => {
      try {
        let query = supabase
          .from('listings')
          .select(`*, profiles:seller_id (full_name, avatar_url, campus), categories(name), listing_images(image_url)`)
          .eq('status', 'active');

        if (selectedCat !== 'all') query = query.eq('category_id', selectedCat);
        if (minPrice) query = query.gte('price', minPrice);
        if (maxPrice) query = query.lte('price', maxPrice);

        const { data } = await query.order('created_at', { ascending: false });
        
        let filtered = data || [];
        if (selectedCampus !== 'all') {
          filtered = filtered.filter(item => item.profiles?.campus === selectedCampus);
        }
        setMarketListings(filtered);
      } catch (err) {
        console.error("Market Error:", err.message);
      }
    };
    fetchMarket();
  }, [selectedCat, selectedCampus, minPrice, maxPrice]);

  // --- HANDLERS ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/'); 
  };

  const handleSaveProfileSuccess = (updatedData) => {
    setProfile(prev => ({ ...prev, ...updatedData }));
    setView('profile'); // Return to the Profile View after editing
    setIsMenuOpen(false);
  };

  return (
    <main className="dashboard-container">
      {/* 1. UNIVERSAL HEADER */}
      <header className="main-header">
        <nav className="header-nav">
          <section className="logo-section" onClick={() => setView('market')}>
            <img src="/UniMartlogo.png" alt="Logo" className="header-logo" />
            <h1 className="logo-text">UniMart</h1>
          </section>
          
          <section className="header-actions">
            <button className="icon-btn" onClick={() => navigate('/search')}><Search size={20} /></button>
            <button className="icon-btn" onClick={() => navigate('/cart')}><ShoppingBag size={20} /></button>
            <button className="icon-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </nav>
        </nav>

        {/* BURGER MENU */}
        {isMenuOpen && (
          <aside className="burger-menu">
            <ul className="menu-list">
              <li>
                <button onClick={() => { setView('profile'); setIsMenuOpen(false); }}>
                  <User size={18} /> My Profile
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/settings')}>
                  <Settings size={18} /> Settings
                </button>
              </li>
              <li className="menu-divider"></li>
              <li>
                <button className="logout-action-btn" onClick={handleLogout}>
                  <LogOut size={18} /> Logout
                </button>
              </li>
            </ul>
          </aside>
        )}
      </header>

      {/* 2. CONDITIONAL CONTENT RENDERING */}
      
      {/* VIEW: MY PROFILE (Centered Big View) */}
      {view === 'profile' && (
        <MyProfile 
          profile={profile} 
          onEditClick={() => setView('edit')} 
          navigate={navigate} 
        />
      )}

      {/* VIEW: EDIT PROFILE (Form) */}
      {view === 'edit' && (
        <EditProfile 
          profile={profile} 
          onCancel={() => setView('profile')} 
          onSaveSuccess={handleSaveProfileSuccess} 
        />
      )}

      {/* VIEW: MARKETPLACE (Default Feed) */}
      {view === 'market' && (
        <>
          {/* HERO */}
          <section className="hero-section">
            <header className="hero-content">
              <p className="hero-kicker">WELCOME BACK, {profile?.full_name?.split(' ')[0].toUpperCase() || 'STUDENT'}</p>
              <h2 className="hero-title">Your campus marketplace is waiting for you.</h2>
              <p className="hero-description">Trade securely with verified university students.</p>
            </header>
          </section>

          {/* QUICK ACTIONS */}
          <section className="quick-actions-grid">
            <article className="action-block" onClick={() => navigate('/my-listings')}>
              <figure className="block-icon"><Box size={24} /></figure>
              <h3>My Listings</h3>
              <p>Manage your posts.</p>
            </article>
            <article className="action-block" onClick={() => navigate('/messages')}>
              <figure className="block-icon"><MessageCircle size={24} /></figure>
              <h3>My Messages</h3>
              <p>Chat with buyers.</p>
            </article>
            <article className="action-block" onClick={() => setView('profile')}>
              <figure className="block-icon"><User size={24} /></figure>
              <h3>My Profile</h3>
              <p>View your stats.</p>
            </article>
            <article className="action-block" onClick={() => navigate('/browse')}>
              <figure className="block-icon"><ShoppingBag size={24} /></figure>
              <h3>Browse All</h3>
              <p>Full catalog.</p>
            </article>
          </section>

          {/* RECENT LISTINGS */}
          <section className="recent-section">
            <header className="section-header"><h2>Recent Listings</h2></header>
            <section className="listings-grid-layout">
              {recentListings.map(item => <ListingCard key={item.id} item={item} />)}
            </section>
          </section>

          {/* MARKET FEED AND FILTERS */}
          <section className="market-layout">
            <aside className="filter-sidebar">
              <header className="sidebar-header"><Filter size={18} /><h3>Filters</h3></header>
              <form className="filter-form">
                <fieldset><legend>Campus</legend>
                  <select value={selectedCampus} onChange={(e) => setSelectedCampus(e.target.value)}>
                    <option value="all">All Campuses</option>
                    {campusOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </fieldset>
                <fieldset><legend>Category</legend>
                  <select value={selectedCat} onChange={(e) => setSelectedCat(e.target.value)}>
                    <option value="all">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </fieldset>
                <fieldset><legend>Price Range</legend>
                  <div className="price-inputs">
                    <input type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
                    <input type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
                  </div>
                </fieldset>
                <button 
                  type="button" 
                  className="reset-btn" 
                  onClick={() => {setSelectedCat('all'); setSelectedCampus('all'); setMinPrice(''); setMaxPrice('');}}
                >
                  Clear Filters
                </button>
              </form>
            </aside>

            <section className="market-results">
              <header className="section-header"><h2>Market Feed</h2></header>
              <section className="listings-grid-layout">
                {marketListings.length > 0 ? (
                  marketListings.map(item => <ListingCard key={item.id} item={item} />)
                ) : (
                  <p className="empty-msg">No items found matching your search.</p>
                )}
              </section>
            </section>
          </section>
        </>
      )}

      {/* 3. FLOATING ACTION BUTTON (Only show in Market View) */}
      {view === 'market' && (
        <button className="create-post-fab" onClick={() => navigate('/create-listing')}>
          <Plus size={24} />
          <label>Create Post</label>
        </button>
      )}
    </main>
  );
};

// --- SUB-COMPONENT: LISTING CARD ---
const ListingCard = ({ item }) => {
  const navigate = useNavigate();
  return (
    <article className="listing-card-item" onClick={() => navigate(`/listing/${item.id}`)}>
      <header className="listing-card-top">
        <figure className="listing-img-container">
          <img src={item.listing_images?.[0]?.image_url || '/placeholder.jpg'} alt="" />
        </figure>
        <section className="seller-mini-info">
          {item.profiles?.avatar_url ? (
            <img src={item.profiles.avatar_url} alt="" className="mini-avatar" />
          ) : (
            <div className="mini-avatar-placeholder"><User size={10} /></div>
          )}
          <p>{item.profiles?.full_name || 'User'}</p>
        </section>
        <section className="campus-badge">
          <MapPin size={10} />
          <p>{item.profiles.campus || 'Main'}</p>
        </section>
      </header>
      <footer className="listing-card-bottom">
        <section className="listing-info-main">
          <h4>{item.title}</h4>
          <mark className="category-tag">{item.categories?.name}</mark>
        </section>
        <p className="listing-price">R {item.price}</p>
      </footer>
    </article>
  );
};

export default StudentDashboard;