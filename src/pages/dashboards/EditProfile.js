import React, { useState, useRef } from 'react';
import { supabase } from '../../supabase';
import { notifyError, notifySuccess } from '../../toast';
import { Camera, User, Phone, Book, MapPin, Save, X, Loader2 } from 'lucide-react';
import './EditProfile.css';

const EditProfile = ({ profile, onCancel, onSaveSuccess }) => {
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || "",
    student_number: profile?.student_number || "",
    campus: profile?.campus || "",
    phone_number: profile?.phone_number || "",
    bio: profile?.bio || "",
    avatar_url: profile?.avatar_url || "",
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileUpload = async (event) => {
    try {
      setIsSaving(true);
      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;

      let { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setFormData(prev => ({ ...prev, avatar_url: data.publicUrl }));
    } catch (error) {
      notifyError('Upload error: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        ...formData,
        updated_at: new Date()
      })
      .eq('id', profile.id);

    setIsSaving(false);
    if (error) {
      notifyError(error.message);
    } else {
      notifySuccess('Profile updated successfully!');
      onSaveSuccess(formData); // This triggers the reload in the parent
    }
  };

  return (
    <div className="ep-workspace">
      <div className="ep-card">
        <header className="ep-header">
          <h2>Edit My Profile</h2>
          <button className="ep-close-btn" onClick={onCancel}><X size={20} /></button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="ep-body">
            <aside className="ep-avatar-section">
              <div className="ep-avatar-wrapper" onClick={() => fileInputRef.current.click()}>
                <img src={formData.avatar_url || '/placeholder.jpg'} alt="Profile" />
                <div className="ep-camera-overlay">
                  <Camera size={24} />
                  <span>Update Photo</span>
                </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" hidden />
            </aside>

            <div className="ep-inputs-column">
              <div className="ep-input-group">
                <label><User size={14} /> Full Name</label>
                <div className="ep-input-wrapper">
                  <User size={18} />
                  <input name="full_name" value={formData.full_name} onChange={handleInputChange} required />
                </div>
              </div>

              <div className="ep-input-group">
                <label><Phone size={14} /> Phone Number</label>
                <div className="ep-input-wrapper">
                  <Phone size={18} />
                  <input name="phone_number" value={formData.phone_number} onChange={handleInputChange} />
                </div>
              </div>

              <div className="ep-input-group">
                <label><Book size={14} /> Student Number</label>
                <div className="ep-input-wrapper">
                  <Book size={18} />
                  <input name="student_number" value={formData.student_number} onChange={handleInputChange} />
                </div>
              </div>

              <div className="ep-input-group">
                <label><MapPin size={14} /> Campus</label>
                <div className="ep-input-wrapper">
                  <MapPin size={18} />
                  <select name="campus" value={formData.campus} onChange={handleInputChange}>
                    <option value="">Select Campus</option>
                    <option value="Main Campus">Main Campus</option>
                    <option value="Education Campus">Education Campus</option>
                    <option value="Med Campus">Med Campus</option>
                  </select>
                </div>
              </div>

              <div className="ep-input-group ep-full-width">
                <label>Bio</label>
                <div className="ep-input-wrapper">
                  <textarea name="bio" value={formData.bio} onChange={handleInputChange} rows="3" placeholder="Tell students about yourself..." />
                </div>
              </div>
            </div>
          </div>

          <footer className="ep-footer">
            <button type="button" className="ep-btn-cancel" onClick={onCancel}>Cancel</button>
            <button type="submit" className="ep-btn-save" disabled={isSaving}>
              {isSaving ? <Loader2 className="ep-spinner" size={18} /> : <Save size={18} />}
              Save Changes
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;