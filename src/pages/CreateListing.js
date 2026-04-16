import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Loader2 } from 'lucide-react';
import { supabase } from '../supabase';
import './CreateListing.css';

const CreateListing = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    description: '',
    price: '',
    listing_type: 'sale'
  });

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from('categories').select('*');
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageFile) return alert("Please add a picture!");
    if (!formData.category_id) return alert("Please select a category!");

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Upload Image to the CAPITALIZED bucket
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('listing-Images') // UPDATED TO CAPITAL I
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('listing-Images') // UPDATED TO CAPITAL I
        .getPublicUrl(filePath);

      // 2. Create Listing Row
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert([{
          seller_id: user.id,
          title: formData.title,
          category_id: parseInt(formData.category_id),
          description: formData.description,
          price: parseFloat(formData.price),
          listing_type: formData.listing_type,
          status: 'active'
        }])
        .select().single();

      if (listingError) throw listingError;

      // 3. Link Image URL to Listing Table
      await supabase.from('listing_images').insert([{
        listing_id: listing.id,
        image_url: publicUrl,
        is_primary: true
      }]);

      alert("Listing Posted Successfully!");
      navigate('/dashboard/student');
    } catch (err) {
      alert("Post Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="create-listing-page">
      <nav className="top-nav-bar">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} /> Back
        </button>
      </nav>

      <section className="create-card-container">
        <form className="listing-form-content" onSubmit={handleSubmit}>
          
          <header className="image-upload-box">
            <input 
              type="file" id="pic-upload" accept="image/*" 
              onChange={handleImageChange} hidden 
            />
            <label htmlFor="pic-upload" className="upload-trigger">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="upload-preview" />
              ) : (
                <div className="placeholder-content">
                  <Camera size={48} />
                  <p>Add Picture</p>
                </div>
              )}
            </label>
          </header>

          <fieldset className="form-fields-grid">
            <div className="input-field">
              <label>Title:</label>
              <input 
                type="text" required 
                onChange={(e) => setFormData({...formData, title: e.target.value})} 
              />
            </div>

            <div className="input-field">
              <label>Category:</label>
              <select 
                required 
                onChange={(e) => setFormData({...formData, category_id: e.target.value})}
              >
                <option value="">Select...</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="input-field full-width">
              <label>Description:</label>
              <textarea 
                required rows="3"
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              ></textarea>
            </div>

            <div className="input-field">
              <label>Price (R):</label>
              <input 
                type="number" required 
                onChange={(e) => setFormData({...formData, price: e.target.value})} 
              />
            </div>

            <div className="input-field radio-group">
               <label>Listing Type:</label>
               <div className="radio-options">
                  <label><input type="radio" name="type" value="sale" defaultChecked onChange={() => setFormData({...formData, listing_type: 'sale'})}/> Sale</label>
                  <label><input type="radio" name="type" value="trade" onChange={() => setFormData({...formData, listing_type: 'trade'})}/> Trade</label>
               </div>
            </div>
          </fieldset>

          <button type="submit" className="post-btn" disabled={loading}>
            {loading ? <Loader2 className="spinner" /> : "POST"}
          </button>
        </form>
      </section>
    </main>
  );
};

export default CreateListing;