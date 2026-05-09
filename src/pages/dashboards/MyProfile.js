import React, { useState, useEffect } from 'react';
import { 
  Phone, Star, ShieldCheck, Briefcase, Edit3, 
  MapPin, Send, ArrowLeft, Trash2, Clock, 
  User, IdCard, Loader2, Box 
} from 'lucide-react';
import { supabase } from '../../supabase';
import LoadingScreen from '../../components/LoadingScreen';
import './StudentDashboard.css'; 

const MyProfile = ({ profile, onEditClick, onBack, navigate, onOpenRolePopup }) => {
  const [view, setView] = useState('profile'); 
  const [loading, setLoading] = useState(false);
  const [existingApp, setExistingApp] = useState(null);
  const [isFetchingApp, setIsFetchingApp] = useState(true);

  const [formData, setFormData] = useState({
    motivation: '', experience: '', campus_location: '', availability: '', scenario_response: ''
  });

  useEffect(() => {
    if (profile?.id) { fetchApplication(); }
  }, [profile?.id]);

  const fetchApplication = async () => {
    setIsFetchingApp(true);
    const { data } = await supabase.from('role_applications').select('*').eq('user_id', profile.id).maybeSingle();
    setExistingApp(data);
    setIsFetchingApp(false);
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
    await supabase.from('role_applications').delete().eq('user_id', profile.id);
    setExistingApp(null);
  };

  if (!profile || isFetchingApp) return <LoadingScreen />;

  // --- APPLICATION FORM VIEW (RESTORED TO ORIGINAL STYLING) ---
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
                <textarea 
                  name={isStaff ? "campus_location" : "motivation"} 
                  required 
                  onChange={(e) => setFormData({...formData, [e.target.name]: e.target.value})} 
                />
              </article>
              <article className="form-group">
                <label style={{color: 'white'}}>Availability</label>
                <input 
                  name="availability" 
                  required 
                  placeholder="e.g. Mon-Fri" 
                  onChange={(e) => setFormData({...formData, availability: e.target.value})} 
                />
              </article>
            </fieldset>
            <button type="submit" className="submit-app-btn" disabled={loading}>
                {loading ? <Loader2 className="spinner" /> : "Submit Application"}
            </button>
          </form>
        </article>
      </section>
    );
  }

  // --- MAIN PROFILE VIEW ---
  return (
    <section className="profile-view-section">
      <nav className="profile-top-nav">
        <button className="back-to-dash-btn" onClick={onBack}>
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
      </nav>

      <header className="profile-header-card">
        <figure className="profile-avatar-large">
          {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : <User size={60} color="#0077b6" />}
        </figure>
        <article className="profile-main-info">
          <nav className="header-top-row">
             <h1>{profile.full_name}</h1>
             {existingApp?.status === 'pending' && <mark className="status-badge-gold"><Clock size={14} /> Pending {existingApp.requested_role}</mark>}
             {existingApp?.status === 'approved' && <mark className="status-badge-green" style={{background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '99px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px'}}><Star size={14} /> Upgrade Ready</mark>}
          </nav>
          <nav className="profile-contact-row">
            <p><IdCard size={14} /> {profile.student_number || 'ID Not Set'}</p>
            <p><MapPin size={14} /> {profile.campus || 'Main Campus'}</p>
          </nav>
          <p className="profile-bio-text">{profile.bio || "No bio yet."}</p>
          <nav className="profile-btn-group">
            <button className="edit-profile-btn" onClick={onEditClick}><Edit3 size={16} /> Edit Profile</button>
            {existingApp?.status === 'pending' && <button className="withdraw-btn-small" onClick={withdrawApplication}><Trash2 size={14} /> Withdraw</button>}
          </nav>
        </article>
      </header>

      {/* --- CLAIM ROLE BANNER --- */}
      {existingApp?.status === 'approved' && (
          <div 
            className="claim-role-banner" 
            onClick={onOpenRolePopup} 
            style={{cursor: 'pointer', background: '#e8f5e9', border: '2px solid #27ae60', borderRadius: '15px', padding: '20px', margin: '20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.05)'}}
          >
              <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
                <ShieldCheck color="#27ae60" size={30} />
                <div style={{textAlign: 'left'}}>
                    <strong style={{display: 'block', color: '#1b5e20', fontSize: '18px'}}>Upgrade Ready!</strong>
                    <p style={{margin: 0, color: '#2e7d32'}}>Your {existingApp.requested_role} status is approved. Click to activate.</p>
                </div>
              </div>
              <button style={{background: '#27ae60', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold'}}>Activate Now</button>
          </div>
      )}

      <footer className="profile-action-footer">
        <article className="action-card-mini" onClick={() => navigate('/my-listings')}>
          <Box size={22} />
          <strong>My Listings</strong>
        </article>
        
        {!existingApp && (
          <>
            <article className="action-card-mini" onClick={() => setView('apply_staff')}>
              <Briefcase size={22} />
              <strong>Apply Staff</strong>
            </article>
            <article className="action-card-mini" onClick={() => setView('apply_admin')}>
              <ShieldCheck size={22} />
              <strong>Apply Admin</strong>
            </article>
          </>
        )}
      </footer>
    </section>
  );
};

export default MyProfile;