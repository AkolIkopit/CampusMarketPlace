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
    listing_type: 'sale',
    condition: 'Good' // Default condition
  });

  const conditionOptions = ["New", "Like New", "Good", "Fair", "Poor"];

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('*');
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
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      await supabase.storage.from('listing-Images').upload(filePath, imageFile);
      const { data: { publicUrl } } = supabase.storage.from('listing-Images').getPublicUrl(filePath);

      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert([{
          seller_id: user.id,
          title: formData.title,
          category_id: parseInt(formData.category_id),
          description: formData.description,
          price: parseFloat(formData.price),
          listing_type: formData.listing_type,
          condition: formData.condition, // Added field
          status: 'active'
        }])
        .select().single();

      if (listingError) throw listingError;

      await supabase.from('listing_images').insert([{
        listing_id: listing.id,
        image_url: publicUrl,
        is_primary: true
      }]);

      alert("Listing Posted!");
      navigate('/dashboard/student');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="create-listing-page">
      <section className="aurora-bg" aria-hidden="true">
        <hr className="orb orb-1" /><hr className="orb orb-2" /><hr className="orb orb-3" />
      </section>

      <nav className="top-nav-bar">
        <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /> Back</button>
      </nav>

      <section className="create-card-container">
        <form className="listing-form-content" onSubmit={handleSubmit}>
          <header className="image-upload-box">
            <input type="file" id="pic-upload" accept="image/*" onChange={handleImageChange} hidden />
            <label htmlFor="pic-upload" className="upload-trigger">
              {imagePreview ? <img src={imagePreview} alt="Preview" className="upload-preview" /> : <article className="placeholder-content"><Camera size={48} /><p>Add Picture</p></article>}
            </label>
          </header>

          <fieldset className="form-fields-grid">
            <article className="input-field"><label>Title:</label><input type="text" required onChange={(e) => setFormData({...formData, title: e.target.value})} /></article>
            <article className="input-field">
              <label>Category:</label>
              <select required onChange={(e) => setFormData({...formData, category_id: e.target.value})}>
                <option value="">Select...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </article>
            <article className="input-field">
              <label>Condition:</label>
              <select value={formData.condition} onChange={(e) => setFormData({...formData, condition: e.target.value})}>
                {conditionOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </article>
            <article className="input-field"><label>Price (R):</label><input type="number" required onChange={(e) => setFormData({...formData, price: e.target.value})} /></article>
            <article className="input-field full-width"><label>Description:</label><textarea required rows="3" onChange={(e) => setFormData({...formData, description: e.target.value})}></textarea></article>
          </fieldset>

          <button type="submit" className="post-btn" disabled={loading}>{loading ? <Loader2 className="spinner" /> : "POST"}</button>
        </form>
      </section>
    </main>
  );
};

export default CreateListing;