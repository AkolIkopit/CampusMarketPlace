import React, { useState } from 'react';
import { Phone, Star, ShieldCheck, Briefcase, Edit3, MapPin } from 'lucide-react';
import { supabase } from '../../supabase';
import './MyProfile.css';

const MyProfile = ({ profile, onEditClick, navigate }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const submitRoleRequest = async (role) => {
    if (loading) return;

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        requested_role: role,
      })
      .eq("id", user.id);

   if (error) {
  console.log("Error:", error.message);
  setMessage("Something went wrong. Try again.");
} else {
  setMessage(`Request for ${role} submitted successfully!`);
}

    setLoading(false);
  };

  return (
    <div className="mp-container">
      <div className="mp-card">
         <button
           className="mp-btn mp-btn-back"
           onClick={() => navigate('/dashboard')}
        >
            ← Back to Dashboard
        </button>
        <img 
          src={profile?.avatar_url || '/placeholder.jpg'} 
          alt="Avatar" 
          className="mp-avatar-large" 
        />
        <h1 className="mp-name">{profile?.full_name}</h1>
        {message && <p className="mp-message">{message}</p>}
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
            onClick={() => submitRoleRequest("staff")}
            disabled={loading}
          >
            <Briefcase size={18} /> Request Trade Staff
          </button>

          <button
            className="mp-btn mp-btn-admin"
            onClick={() => submitRoleRequest("admin")}
            disabled={loading}
          >
            <ShieldCheck size={18} /> Request Admin
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