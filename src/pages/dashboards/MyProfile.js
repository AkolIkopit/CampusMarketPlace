import React, { useState, useEffect } from 'react';
import { 
  Phone, Star, ShieldCheck, Briefcase, Edit3, 
  MapPin, Send, ArrowLeft, Trash2, Clock, 
  User, IdCard, Loader2, Box, ShoppingCart, DollarSign, Package
} from 'lucide-react';
import { supabase } from '../../supabase';
import LoadingScreen from '../../components/LoadingScreen';
import './MyProfile.css'; 

const MyProfile = ({ profile, onEditClick, onBack, navigate, onOpenRolePopup }) => {
  const [view, setView] = useState('profile'); 
  const [historyTab, setHistoryTab] = useState('orders'); // 'orders' or 'sales'
  const [loading, setLoading] = useState(false);
  const [existingApp, setExistingApp] = useState(null);
  const [isFetchingApp, setIsFetchingApp] = useState(true);
  const [transactions, setTransactions] = useState([]);

  const [formData, setFormData] = useState({
    motivation: '', experience: '', campus_location: '', availability: '', scenario_response: ''
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
      .select(`*, listings(title, listing_images(image_url))`)
      .order('created_at', { ascending: false });
    if (!error) setTransactions(data || []);
  };

  const submitApplication = async (e, role) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('role_applications').insert([{
      user_id: profile.id, full_name: profile.full_name, requested_role: role, ...formData, status: 'pending'
    }]);
    if (!error) { alert("Application submitted!"); setView('profile'); fetchApplication(); }
    else { alert(error.message); }
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
        <article className="application-form-card">
          <header className="form-header">
            <button onClick={() => setView('profile')} className="back-link-btn"><ArrowLeft size={16} /> Back</button>
            <h2>{isStaff ? 'Apply for Trade Staff' : 'Apply for Campus Admin'}</h2>
          </header>
          <form onSubmit={(e) => submitApplication(e, isStaff ? 'staff' : 'admin')} className="application-main-form">
            <fieldset className="form-grid">
              <article className="form-group">
                <label style={{color: 'white'}}>{isStaff ? "Primary Campus" : "Motivation"}</label>
                <textarea name={isStaff ? "campus_location" : "motivation"} required onChange={(e) => setFormData({...formData, [e.target.name]: e.target.value})} />
              </article>
              <article className="form-group">
                <label style={{color: 'white'}}>Availability</label>
                <input name="availability" required placeholder="e.g. Mon-Fri" onChange={(e) => setFormData({...formData, availability: e.target.value})} />
              </article>
            </fieldset>
            <button type="submit" className="submit-app-btn" disabled={loading}>{loading ? <Loader2 className="spinner" /> : "Submit Application"}</button>
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

        <figure className="profile-avatar-wrap">
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
        
        <nav className="mp-contact-info" style={{display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '20px', color: '#666', fontSize: '0.9rem'}}>
          <p style={{display: 'flex', alignItems: 'center', gap: '5px'}}><Phone size={14} /> {profile.phone_number || 'No contact'}</p>
          <p style={{display: 'flex', alignItems: 'center', gap: '5px'}}><MapPin size={14} /> {profile.campus || 'Main Campus'}</p>
        </nav>

        <p className="mp-bio">{profile.bio || "No bio yet. Tell fellow students about yourself!"}</p>

        {/* TEAMMATE SQUARE BUTTONS */}
        <section className="mp-action-group">
          <button className="mp-btn" onClick={() => navigate('/my-listings')} style={{background: '#F7F3EC', color: '#0d1b2a'}}>
            <Box size={20} /> My Listings
          </button>
          
          <button 
            className="mp-btn" 
            onClick={() => setView('apply_staff')} 
            disabled={loading || existingApp}
            style={{background: '#F7F3EC', color: '#0d1b2a'}}
          >
            <Briefcase size={20} /> Apply Staff
          </button>

          <button 
            className="mp-btn" 
            onClick={() => setView('apply_admin')} 
            disabled={loading || existingApp}
            style={{background: '#F7F3EC', color: '#0d1b2a'}}
          >
            <ShieldCheck size={20} /> Apply Admin
          </button>

          <button className="mp-btn mp-btn-edit" onClick={onEditClick}>
            <Edit3 size={18} /> Edit Profile
          </button>
        </section>

        {/* CLAIM ROLE BANNER */}
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
      <section className="history-section" style={{marginTop: '30px'}}>
        <header className="section-header">
           <h2 style={{borderLeft: '6px solid #f3a91e', paddingLeft: '15px', color: '#0a192f', fontFamily: 'Playfair Display'}}>Activity History</h2>
        </header>
        <nav className="history-tabs" style={{display: 'flex', gap: '10px', margin: '20px 0', borderBottom: '1px solid #eee', paddingBottom: '10px'}}>
          <button className={historyTab === 'orders' ? 'active' : ''} onClick={() => setHistoryTab('orders')} style={{background: historyTab === 'orders' ? '#f0f7ff' : 'none', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', color: historyTab === 'orders' ? '#0077b6' : '#999', cursor: 'pointer'}}>My Orders</button>
          <button className={historyTab === 'sales' ? 'active' : ''} onClick={() => setHistoryTab('sales')} style={{background: historyTab === 'sales' ? '#f0f7ff' : 'none', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', color: historyTab === 'sales' ? '#0077b6' : '#999', cursor: 'pointer'}}>My Sales</button>
        </nav>

        <ul className="history-list" style={{listStyle: 'none', padding: 0}}>
          {(historyTab === 'orders' ? myOrders : mySales).map(t => (
            <li key={t.id} style={{display: 'flex', alignItems: 'center', gap: '20px', padding: '15px', background: 'white', borderRadius: '20px', marginBottom: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)'}}>
              <img src={t.listings?.listing_images[0]?.image_url || '/placeholder.jpg'} alt="" style={{width: '50px', height: '50px', borderRadius: '10px', objectFit: 'cover'}} />
              <nav style={{flex: 1}}>
                <strong style={{display: 'block', color: '#0a192f'}}>{t.listings?.title}</strong>
                <time style={{fontSize: '0.8rem', color: '#aaa'}}>{new Date(t.created_at).toLocaleDateString()}</time>
              </nav>
              <aside style={{textAlign: 'right'}}>
                <p style={{margin: 0, fontWeight: '900', color: '#0a192f'}}>R {t.amount}</p>
                <mark style={{background: '#e6fffa', color: '#00a884', fontSize: '0.6rem', padding: '3px 8px', borderRadius: '10px', textTransform: 'uppercase', fontWeight: 'bold'}}>{t.status}</mark>
              </aside>
            </li>
          ))}
          {(historyTab === 'orders' ? myOrders : mySales).length === 0 && <p style={{textAlign: 'center', color: '#ccc', padding: '40px'}}>No {historyTab} found.</p>}
        </ul>
      </section>
    </main>
  );
};

export default MyProfile;