import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { Send, ArrowLeft } from 'lucide-react';
import './AdminApplication.css'; 

const AdminApplication = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get data passed from the Profile page
  const requestedRole = location.state?.role || 'staff';
  const fullName = location.state?.fullName || 'Student';

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    motivation: '',
    experience: '',
    scam_handling: '',
    availability: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert("You must be logged in to apply.");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('role_applications')
      .insert([
        {
          user_id: user.id,
          full_name: fullName,
          requested_role: requestedRole,
          motivation: formData.motivation,
          experience: formData.experience,
          scam_handling: formData.scam_handling,
          availability: formData.availability,
          status: 'pending'
        }
      ]);

    if (error) {
      if (error.code === '23505') {
        alert("You already have a pending application. Please wait for an admin to review it.");
      } else {
        alert("Error: " + error.message);
      }
    } else {
      alert("Application submitted successfully!");
      navigate(-1); // Takes you back to MyProfile
    }
    setLoading(false);
  };

  return (
    <div className="apply-page-container">
      <div className="apply-form-card">
        <button onClick={() => navigate(-1)} className="apply-back-link">
          <ArrowLeft size={18} /> Back to Profile
        </button>
        
        <h2 className="apply-form-title">Apply for {requestedRole.toUpperCase()}</h2>
        <p className="apply-form-subtitle">Help us moderate the campus marketplace.</p>

        <form onSubmit={handleSubmit} className="apply-main-form">
          <div className="apply-input-group">
            <label>Why do you want to be a {requestedRole}?</label>
            <textarea 
               name="motivation" 
               required 
               value={formData.motivation}
               onChange={handleChange} 
               placeholder="Describe your motivation..." 
            />
          </div>

          <div className="apply-input-group">
            <label>Relevant Experience:</label>
            <textarea 
               name="experience" 
               required 
               value={formData.experience}
               onChange={handleChange} 
               placeholder="Have you had any leadership or moderation roles?" 
            />
          </div>

          <div className="apply-input-group">
            <label>How would you handle a scam report?</label>
            <textarea 
               name="scam_handling" 
               required 
               value={formData.scam_handling}
               onChange={handleChange} 
               placeholder="If a student reports a fake item, what is your process?" 
            />
          </div>

          <div className="apply-input-group">
            <label>Hours available per week:</label>
            <input 
               name="availability" 
               type="text" 
               required 
               value={formData.availability}
               onChange={handleChange} 
               placeholder="e.g. 5-10 hours" 
            />
          </div>

          <button type="submit" className="apply-submit-button" disabled={loading}>
            {loading ? "Submitting..." : <><Send size={18} /> Submit Application</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminApplication;