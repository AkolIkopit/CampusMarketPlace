import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { 
  Plus, ShoppingBag, Box, MessageCircle, 
  Search, Menu, X, User, Settings, LogOut, Filter 
} from 'lucide-react';
import './StudentDashboard.css';

const StaffDashboard = ({ profile: initialProfile }) => {
  const navigate = useNavigate();
  
  const [view, setView] = useState('market'); 
  const [profile] = useState(initialProfile);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [recentListings, setRecentListings] = useState([]);
  const [marketListings, setMarketListings] = useState([]);
  const [categories, setCategories] = useState([]);

  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedCampus, setSelectedCampus] = useState('all');
  const [minPrice] = useState('');
  const [maxPrice] = useState('');

  const campusOptions = ["Main Campus", "Education Campus", "Med Campus"];

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
        console.error("Fetch error:", err.message);
      }
    };
    fetchData();
  }, []);

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
        console.error("Market error:", err.message);
      }
    };
    fetchMarket();
  }, [selectedCat, selectedCampus, minPrice, maxPrice]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/'); 
  };

  return (
    <main className="dashboard-container">
      <section className="aurora-bg" aria-hidden="true">
        <hr className="orb orb-1" /><hr className="orb orb-2" /><hr className="orb orb-3" />
      </section>

      <header className="main-header">
        <nav className="header-nav">
          <section className="logo-section" onClick={() => setView('market')}>
            <img src="/UniMartlogo.png" alt="Logo" className="header-logo" />
            <h1 className="logo-text">UniMart</h1>
          </section>
          
          <nav className="header-actions">
            <button className="icon-btn" aria-label="Search"><Search size={18} /></button>
            <button className="icon-btn" aria-label="Cart" onClick={() => navigate('/cart')}><ShoppingBag size={18} /></button>
            <button className="icon-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </nav>
        </nav>

        {isMenuOpen && (
          <aside className="burger-menu">
            <ul className="menu-list">
              <li><button onClick={() => { setView('profile'); setIsMenuOpen(false); }}><User size={16} /> My Profile</button></li>
              <li><button onClick={() => navigate('/settings')}><Settings size={16} /> Settings</button></li>
              <hr className="menu-divider" />
              <li><button className="logout-action-btn" onClick={handleLogout}><LogOut size={16} /> Logout</button></li>
            </ul>
          </aside>
        )}
      </header>

      {view === 'market' && (
        <>
          <section className="hero-section">
            <header className="hero-content">
              <mark className="hero-kicker">WELCOME BACK, {profile?.full_name?.split(' ')[0].toUpperCase() || 'USER'}</mark>
              <h2 className="hero-title">Your campus marketplace.</h2>
            </header>
          </section>

          <section className="quick-actions-grid">
            <article className="action-block" onClick={() => navigate('/my-listings')}>
              <figure className="block-icon"><Box size={20} /></figure>
              <h3>My Listings</h3>
            </article>
            <article className="action-block" onClick={() => navigate('/messages')}>
              <figure className="block-icon"><MessageCircle size={20} /></figure>
              <h3>Messages</h3>
            </article>
            <article className="action-block" onClick={() => setView('profile')}>
              <figure className="block-icon"><User size={20} /></figure>
              <h3>My Profile</h3>
            </article>
            <article className="action-block" onClick={() => navigate('/browse')}>
              <figure className="block-icon"><ShoppingBag size={20} /></figure>
              <h3>Browse All</h3>
            </article>
          </section>

          <section className="feed-outer-section">
            <header className="section-header"><h2>Recent Listings</h2></header>
            <section className="listings-grid-layout">
              {recentListings.map(item => <ListingCard key={item.id} item={item} />)}
            </section>
          </section>

          <section className="market-layout">
            <aside className="filter-sidebar">
              <header className="sidebar-header"><Filter size={16} /><h3>Filters</h3></header>
              <form className="filter-form">
                <fieldset className="filter-group"><legend>Campus</legend>
                  <select value={selectedCampus} onChange={(e) => setSelectedCampus(e.target.value)}>
                    <option value="all">All Campuses</option>
                    {campusOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </fieldset>
                <fieldset className="filter-group"><legend>Category</legend>
                  <select value={selectedCat} onChange={(e) => setSelectedCat(e.target.value)}>
                    <option value="all">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </fieldset>
                <button type="button" className="reset-btn" onClick={() => {setSelectedCat('all'); setSelectedCampus('all');}}>Clear Filters</button>
              </form>
            </aside>
            <section className="market-results">
              <header className="section-header"><h2>Market</h2></header>
              <section className="listings-grid-layout">
                {marketListings.map(item => <ListingCard key={item.id} item={item} />)}
              </section>
            </section>
          </section>
        </>
      )}

      {view === 'market' && (
        <button className="create-post-fab" onClick={() => navigate('/create-listing')}>
          <Plus size={24} /><label>Create Post</label>
        </button>
      )}
    </main>
  );
};

const ListingCard = ({ item }) => {
  const navigate = useNavigate();
  return (
    <article className="listing-card-item" onClick={() => navigate(`/listing/${item.id}`)}>
      <header className="listing-card-top">
        <figure className="listing-img-container">
          <img src={item.listing_images?.[0]?.image_url || '/placeholder.jpg'} alt={item.title} />
        </figure>
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

export default StaffDashboard;