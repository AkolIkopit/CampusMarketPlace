import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { 
  Plus, ShoppingBag, Box, MessageCircle, 
  Star, Search, Menu, X, User, Settings, LogOut, Loader2, Filter, MapPin 
} from 'lucide-react';
import './StudentDashboard.css';

const StudentDashboard = ({ profile }) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [recentListings, setRecentListings] = useState([]);
  const [marketListings, setMarketListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedCampus, setSelectedCampus] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const campusOptions = ["Main Campus", "Education Campus", "Med Campus"];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: catData } = await supabase.from('categories').select('*');
        setCategories(catData || []);

        const { data: recent, error } = await supabase
          .from('listings')
          .select(`*, profiles:seller_id (full_name, avatar_url, campus), categories(name), listing_images(image_url)`)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(4);

        if (error) throw error;
        setRecentListings(recent || []);
      } catch (err) {
        console.error("Dashboard Fetch Error:", err.message);
      } finally {
        setLoading(false);
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

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;

        let filtered = data || [];
        if (selectedCampus !== 'all') {
          filtered = filtered.filter(item => item.profiles?.campus === selectedCampus);
        }
        setMarketListings(filtered);
      } catch (err) {
        console.error("Market Fetch Error:", err.message);
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
      <header className="main-header">
        <nav className="header-nav">
          <section className="logo-section" onClick={() => navigate('/dashboard/student')}>
            <img src="/UniMartlogo.png" alt="Logo" className="header-logo" />
            <h1 className="logo-text">UniMart</h1>
          </section>
          <section className="header-actions">
            <button className="icon-btn"><Search size={20} /></button>
            <button className="icon-btn" onClick={() => navigate('/cart')}><ShoppingBag size={20} /></button>
            <button className="icon-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </section>
        </nav>
        {isMenuOpen && (
          <aside className="burger-menu">
            <ul className="menu-list">
              <li><button onClick={() => navigate('/profile')}><User size={18} /> My Profile</button></li>
              <li><button onClick={() => navigate('/settings')}><Settings size={18} /> Settings</button></li>
              <li className="menu-divider"></li>
              <li><button className="logout-action-btn" onClick={handleLogout}><LogOut size={18} /> Logout</button></li>
            </ul>
          </aside>
        )}
      </header>

      <section className="hero-section">
        <header className="hero-content">
          <p className="hero-kicker">WELCOME BACK, {profile?.full_name?.split(' ')[0].toUpperCase() || 'STUDENT'}</p>
          <h2 className="hero-title">Your campus marketplace is waiting for you.</h2>
          <p className="hero-description">Join thousands of students already buying, selling, and trading on UniMart.</p>
        </header>
      </section>

      <section className="quick-actions-grid">
        <article className="action-block" onClick={() => navigate('/my-listings')}>
          <figure className="block-icon"><Box size={24} /></figure>
          <h3>My Listings</h3>
          <p>Manage and delete posts.</p>
        </article>
        <article className="action-block" onClick={() => navigate('/messages')}>
          <figure className="block-icon"><MessageCircle size={24} /></figure>
          <h3>My Messages</h3>
          <p>Chat with buyers.</p>
        </article>
        <article className="action-block" onClick={() => navigate('/reviews')}>
          <figure className="block-icon"><Star size={24} /></figure>
          <h3>My Reviews</h3>
          <p>Trust ratings.</p>
        </article>
        <article className="action-block" onClick={() => navigate('/browse')}>
          <figure className="block-icon"><ShoppingBag size={24} /></figure>
          <h3>Browse All</h3>
          <p>Full catalog.</p>
        </article>
      </section>

      <section className="recent-section">
        <header className="section-header"><h2>Recent Listings</h2></header>
        <section className="listings-grid-layout">
          {recentListings.map(item => <ListingCard key={item.id} item={item} />)}
        </section>
      </section>

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
            <fieldset><legend>Price (R)</legend>
              <input type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
              <input type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
            </fieldset>
            <button type="button" className="reset-btn" onClick={() => {setSelectedCat('all'); setSelectedCampus('all'); setMinPrice(''); setMaxPrice('');}}>Clear</button>
          </form>
        </aside>

        <section className="market-results">
          <header className="section-header"><h2>Market</h2></header>
          <section className="listings-grid-layout">
            {marketListings.map(item => <ListingCard key={item.id} item={item} />)}
          </section>
        </section>
      </section>

      <button className="create-post-fab" onClick={() => navigate('/create-listing')}>
        <Plus size={24} />
        <label>Create Post</label>
      </button>
    </main>
  );
};

const ListingCard = ({ item }) => {
  const navigate = useNavigate();
  return (
    <article className="listing-card-item" onClick={() => navigate(`/listing/${item.id}`)}>
      <header className="listing-card-top">
        <figure className="listing-img-container">
          <img src={item.listing_images[0]?.image_url || '/placeholder.jpg'} alt="" />
        </figure>
        <section className="seller-mini-info">
          {item.profiles?.avatar_url ? <img src={item.profiles.avatar_url} alt="" className="mini-avatar" /> : <User size={12} />}
          <p>{item.profiles?.full_name || 'User'}</p>
        </section>
        <section className="campus-badge">
          <MapPin size={10} />
          <p>{item.profiles?.campus || 'Main'}</p>
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