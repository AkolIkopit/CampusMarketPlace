import React from 'react';
import { User, Phone, Star, ShieldCheck, Briefcase, Edit3, MapPin } from 'lucide-react';
import './MyProfile.css';

const MyProfile = ({ profile, onEditClick, navigate }) => {
  return (
    <div className="mp-container">
      <div className="mp-card">
        <img 
          src={profile?.avatar_url || '/placeholder.jpg'} 
          alt="Avatar" 
          className="mp-avatar-large" 
        />
        <h1 className="mp-name">{profile?.full_name}</h1>
        <p className="mp-student-id">Student ID: {profile?.student_number || 'Not Set'}</p>
        
        <div className="mp-contact-info">
          <span><Phone size={16} /> {profile?.phone_number || 'No contact'}</span>
          <span><MapPin size={16} /> {profile?.campus || 'No campus set'}</span>
        </div>

        <p className="mp-bio">{profile?.bio || "No bio yet. Tell other students a bit about yourself!"}</p>

        <div className="mp-action-group">
          <button className="mp-btn mp-btn-reviews" onClick={() => navigate('/reviews')}>
            <Star size={18} /> My Reviews
          </button>
          
          <button className="mp-btn mp-btn-staff" onClick={() => alert('Request to be Trade Staff sent to Admin!')}>
            <Briefcase size={18} /> Request Trade Staff
          </button>

          <button className="mp-btn mp-btn-admin" onClick={() => alert('Admin Request sent!')}>
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