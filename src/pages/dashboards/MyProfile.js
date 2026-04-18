import React, { useState, useEffect } from 'react';
import { Phone, Star, ShieldCheck, Briefcase, Edit3, MapPin, Send, ArrowLeft, Trash2, Clock } from 'lucide-react';
import { supabase } from '../../supabase';
import './MyProfile.css';
import './AdminApplication.css'; 

const MyProfile = ({ profile, onEditClick, navigate }) => {
  // --- INTERNAL STATE ---
  const [view, setView] = useState('profile'); // 'profile', 'apply_admin', 'apply_staff'
  const [loading, setLoading] = useState(false);
  const [existingApp, setExistingApp] = useState(null);
  const [formData, setFormData] = useState({
    motivation: '',
    experience: '',
    campus_location: '',
    availability: '',
    scenario_response: ''
  });

  // Check for existing application on load
  useEffect(() => {
  if (profile?.id) {
    fetchApplication();
  }
}, [profile?.id]); // Change [profile] to [profile?.id]

  const fetchApplication = async () => {
    const { data } = await supabase
      .from('role_applications')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle();
    setExistingApp(data);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const submitApplication = async (e, role) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('role_applications')
      .insert([{
        user_id: profile.id,
        full_name: profile?.full_name,
        requested_role: role,
        ...formData
      }]);

    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("Application submitted successfully!");
      setView('profile');
      fetchApplication();
    }
    setLoading(false);
  };

  const withdrawApplication = async () => {
    if (!window.confirm("Are you sure you want to withdraw your application?")) return;
    setLoading(true);
    const { error } = await supabase
      .from('role_applications')
      .delete()
      .eq('user_id', profile.id);

    if (error) alert(error.message);
    else {
      setExistingApp(null);
      alert("Application withdrawn.");
    }
    setLoading(false);
  };

  // --- VIEW: STAFF APPLICATION ---
  if (view === 'apply_staff') {
    return (
      <div className="apply-page-container">
        <div className="apply-form-card">
          <button onClick={() => setView('profile')} className="apply-back-link"><ArrowLeft size={16} /> Back to Profile</button>
          <h2 className="apply-form-title">Trade Facility Staff</h2>
          <p className="apply-form-subtitle">Manage item drop-offs, collections, and verify student transactions on campus.</p>
          <form onSubmit={(e) => submitApplication(e, 'staff')} className="apply-main-form">
            <div className="apply-input-group">
              <label>Which campus are you primarily based at?</label>
              <input name="campus_location" required onChange={handleChange} placeholder="e.g. Main Campus / Engineering Block" />
            </div>
            <div className="apply-input-group">
              <label>Weekly Availability:</label>
              <textarea name="availability" required onChange={handleChange} placeholder="e.g. Monday to Friday, 2pm - 5pm" />
            </div>
            <div className="apply-input-group">
              <label>How do you stay organized with physical logistics?</label>
              <textarea name="experience" required onChange={handleChange} placeholder="Describe any relevant experience..." />
            </div>
            <div className="apply-input-group">
              <label>A student claims they dropped off an item, but you don't have it. What do you do?</label>
              <textarea name="scenario_response" required onChange={handleChange} placeholder="Your response..." />
            </div>
            <input type="hidden" name="motivation" value="Applying for Trade Staff" /> 
            <button type="submit" className="apply-submit-button" disabled={loading}>
              {loading ? "Submitting..." : <><Send size={18} /> Submit Staff Application</>}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- VIEW: ADMIN APPLICATION ---
  if (view === 'apply_admin') {
    return (
      <div className="apply-page-container">
        <div className="apply-form-card">
          <button onClick={() => setView('profile')} className="apply-back-link"><ArrowLeft size={16} /> Back to Profile</button>
          <h2 className="apply-form-title">Campus Admin</h2>
          <p className="apply-form-subtitle">Help moderate the platform, prevent scams, and help the community.</p>
          <form onSubmit={(e) => submitApplication(e, 'admin')} className="apply-main-form">
            <div className="apply-input-group">
              <label>Why do you want to be a Campus Admin?</label>
              <textarea name="motivation" required onChange={handleChange} placeholder="Tell us your motivation..." />
            </div>
            <div className="apply-input-group">
              <label>Previous Experience (Moderation/Leadership):</label>
              <textarea name="experience" required onChange={handleChange} />
            </div>
            <div className="apply-input-group">
              <label>How would you handle a report of a student scamming others?</label>
              <textarea name="scenario_response" required onChange={handleChange} />
            </div>
            <div className="apply-input-group">
              <label>Availability (Hours per week):</label>
              <input name="availability" required onChange={handleChange} placeholder="e.g. 10 hours a week" />
            </div>
            <button type="submit" className="apply-submit-button" disabled={loading}>
              {loading ? "Submitting..." : <><Send size={18} /> Submit Admin Application</>}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- VIEW: PROFILE (Original Structure) ---
  return (
    <div className="mp-container">
      <div className="mp-card">
         <button className="mp-btn mp-btn-back" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
        </button>
        
        <img src={profile?.avatar_url || '/placeholder.jpg'} alt="Avatar" className="mp-avatar-large" />
        <h1 className="mp-name">{profile?.full_name}</h1>
        
        {/* Pending Application Status Banner */}
        {existingApp && (
          <div className="mp-status-banner">
            <div className="mp-status-text">
              <Clock size={16} />
              <span>Pending <strong>{existingApp.requested_role}</strong> Application</span>
            </div>
            <button className="mp-withdraw-btn" onClick={withdrawApplication} disabled={loading}>
              <Trash2 size={14} /> Withdraw
            </button>
          </div>
        )}

        <p className="mp-student-id">Student ID: {profile?.student_number || 'Not Set'}</p>
        
        <div className="mp-contact-info">
          <span><Phone size={16} /> {profile?.phone_number || 'No contact'}</span>
          <span><MapPin size={16} /> {profile?.campus || 'No campus set'}</span>
        </div>

        <p className="mp-bio">
          {profile?.bio || "No bio yet. Tell other students a bit about yourself!"}
        </p>

        <div className="mp-action-group">
          <button className="mp-btn mp-btn-reviews" onClick={() => navigate('/reviews')}>
            <Star size={18} /> My Reviews
          </button>
          
          <button
            className="mp-btn mp-btn-staff"
            onClick={() => setView('apply_staff')}
            disabled={loading || existingApp}
          >
            <Briefcase size={18} /> {existingApp?.requested_role === 'staff' ? 'Applied for Staff' : 'Trade Staff'}
          </button>

          <button
            className="mp-btn mp-btn-admin"
            onClick={() => setView('apply_admin')}
            disabled={loading || existingApp}
          >
            <ShieldCheck size={18} /> {existingApp?.requested_role === 'admin' ? 'Applied for Admin' : 'Request Admin'}
          </button>

          <button className="mp-btn mp-btn-edit" onClick={onEditClick}>
            <Edit3 size={18} /> Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;