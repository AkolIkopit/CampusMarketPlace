import React, { useState, useEffect } from 'react';
import { Phone, Star, ShieldCheck, Briefcase, Edit3, MapPin, Send, ArrowLeft, Trash2, Clock, User, IdCard, Loader2, Box } from 'lucide-react';
import { supabase } from '../../supabase';
import LoadingScreen from '../../components/LoadingScreen';
import './StudentDashboard.css'; 

const MyProfile = ({ profile, onEditClick, onBack, navigate }) => {
  const [view, setView] = useState('profile'); 
  const [loading, setLoading] = useState(false);
  const [existingApp, setExistingApp] = useState(null);
  const [formData, setFormData] = useState({
    motivation: '', experience: '', campus_location: '', availability: '', scenario_response: ''
  });

  useEffect(() => {
    if (profile?.id) { fetchApplication(); }
  }, [profile?.id]);

  const fetchApplication = async () => {
    const { data } = await supabase.from('role_applications').select('*').eq('user_id', profile.id).maybeSingle();
    setExistingApp(data);
  };

  if (!profile) return <LoadingScreen />;

  const submitApplication = async (e, role) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('role_applications').insert([{
      user_id: profile.id, full_name: profile.full_name, requested_role: role, ...formData
    }]);
    if (!error) { alert("Application submitted!"); setView('profile'); fetchApplication(); }
    setLoading(false);
  };

  if (view === 'apply_staff' || view === 'apply_admin') {
    const isStaff = view === 'apply_staff';
    return (
      <section className="profile-view-section">
        <article className="application-form-card">
          <header className="form-header">
            <button onClick={() => setView('profile')} className="back-link-btn"><ArrowLeft size={16} /> Back</button>
            <h2>{isStaff ? 'Staff Application' : 'Admin Application'}</h2>
          </header>
          <form onSubmit={(e) => submitApplication(e, isStaff ? 'staff' : 'admin')} className="application-main-form">
            <fieldset className="form-grid">
              <article className="form-group"><label>{isStaff ? "Primary Campus" : "Motivation"}</label><textarea name={isStaff ? "campus_location" : "motivation"} required onChange={(e) => setFormData({...formData, [e.target.name]: e.target.value})} /></article>
              <article className="form-group"><label>Availability</label><input name="availability" required placeholder="e.g. Mon-Fri" onChange={(e) => setFormData({...formData, availability: e.target.value})} /></article>
            </fieldset>
            <button type="submit" className="submit-app-btn" disabled={loading}>{loading ? <Loader2 className="spinner" /> : "Submit Application"}</button>
          </form>
        </article>
      </section>
    );
  }

  return (
    <section className="profile-view-section">
      <nav className="profile-top-nav">
        <button className="back-to-dash-btn" onClick={onBack}><ArrowLeft size={18} /> Back to Dashboard</button>
      </nav>
      <header className="profile-header-card">
        <figure className="profile-avatar-large">
          {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : <User size={60} color="#0077b6" />}
        </figure>
        <article className="profile-main-info">
          <nav className="header-top-row">
             <h1>{profile.full_name}</h1>
             {existingApp && <mark className="status-badge-gold"><Clock size={14} /> Pending {existingApp.requested_role}</mark>}
          </nav>
          <nav className="profile-contact-row">
            <p><IdCard size={14} /> {profile.student_number || 'ID Not Set'}</p>
            <p><MapPin size={14} /> {profile.campus || 'Main Campus'}</p>
          </nav>
          <p className="profile-bio-text">{profile.bio || "No bio yet."}</p>
          <button className="edit-profile-btn" onClick={onEditClick}><Edit3 size={16} /> Edit Profile</button>
        </article>
      </header>
      <footer className="profile-action-footer">
        <article className="action-card-mini" onClick={() => navigate('/my-listings')}><Box size={22} /><strong>My Listings</strong></article>
        <article className="action-card-mini" onClick={() => setView('apply_staff')}><Briefcase size={22} /><strong>Apply Staff</strong></article>
        <article className="action-card-mini" onClick={() => setView('apply_admin')}><ShieldCheck size={22} /><strong>Apply Admin</strong></article>
      </footer>
    </section>
  );
};

export default MyProfile;