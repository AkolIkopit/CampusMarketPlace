import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Loader2, Lightbulb } from 'lucide-react';
import { supabase } from '../supabase';
import LoadingScreen from '../components/LoadingScreen';
import './CreateListing.css';

const CreateListing = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  // States for Price Suggestion
  const [suggestion, setSuggestion] = useState(null);
  const [isFetchingSuggestion, setIsFetchingSuggestion] = useState(false);

  const [formData, setFormData] = useState({
    title: '', 
    category_id: '', 
    description: '', 
    price: '', 
    listing_type: 'sale',
    condition: 'Good',
    campus: 'Main Campus'
  });

  const conditionOptions = ["New", "Like New", "Good", "Fair", "Poor"];
  const campusOptions = ["Main Campus", "Education Campus", "Med Campus"];

   const fetchLiveSAInflation = async () => {
  try {
    // This hits the World Bank API for South Africa's most recent CPI inflation data
    const response = await fetch(
      "https://api.worldbank.org/v2/country/ZAF/indicator/FP.CPI.TOTL.ZG?format=json&per_page=1"
    );
    const data = await response.json();
    
    // Extract the most recent percentage (e.g., 5.9 for 5.9%)
    const liveInflationRate = data[1][0].value; 
    console.log("Live SA Inflation Rate from World Bank:", liveInflationRate + "%");
    
    // Return as a multiplier (e.g., 1.059)
    return 1 + (liveInflationRate / 100);
  } catch (error) {
    console.error("Failed to fetch live economic data, using database defaults:", error);
    return null; // Fallback
  }
};
  // 1. Fetch Categories for the dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('*');
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  // 2. LIVE SA DATA INTEGRATION LOGIC
  useEffect(() => {
  const getLiveSASuggestion = async () => {
    if (!formData.category_id || !formData.condition) return;

    setIsFetchingSuggestion(true);
    
    const selectedCat = categories.find(c => c.id === parseInt(formData.category_id));
    if (!selectedCat) {
      setIsFetchingSuggestion(false);
      return;
    }

    // 1. Fetch live inflation from the World Bank API
    const liveMultiplier = await fetchLiveSAInflation();

    // 2. Fetch the category base data from Supabase
    let { data: econ } = await supabase
      .from('sa_economic_indicators')
      .select('*')
      .ilike('category_name', selectedCat.name) 
      .maybeSingle();

    // Fuzzy match logic for symbols (Art & Craft)
    if (!econ) {
      const firstWord = selectedCat.name.split(' ')[0];
      const { data: fuzzyEcon } = await supabase
        .from('sa_economic_indicators')
        .select('*')
        .ilike('category_name', `${firstWord}%`)
        .maybeSingle();
      econ = fuzzyEcon;
    }

    if (econ) {
      // Use the Live World Bank multiplier if available, otherwise use the DB's static CPI
      const currentInflation = liveMultiplier || econ.cpi_factor;
      
      const weights = { 'New': 0.9, 'Like New': 0.75, 'Good': 0.55, 'Fair': 0.35, 'Poor': 0.15 };
      
      // CALCULATION: (Research Price * Live World Bank Inflation) * Condition
      const currentMarketNewPrice = econ.base_new_price * currentInflation;
      const suggested = currentMarketNewPrice * (weights[formData.condition] || 0.5);

      setSuggestion({
        price: Math.round(suggested),
        // Prove it's live in the UI
        source: liveMultiplier ? "Live World Bank SA Data" : econ.source_info
      });
    } else {
      setSuggestion(null);
    }
    setIsFetchingSuggestion(false);
  };

  getLiveSASuggestion();
}, [formData.category_id, formData.condition, categories])

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
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('listing-Images')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('listing-Images')
        .getPublicUrl(filePath);

      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert([{
          seller_id: user.id,
          title: formData.title,
          category_id: parseInt(formData.category_id),
          description: formData.description,
          price: parseFloat(formData.price),
          listing_type: formData.listing_type,
          condition: formData.condition,
          location: formData.campus, 
          status: 'active'
        }])
        .select().single();

      if (listingError) throw listingError;

      await supabase.from('listing_images').insert([{
        listing_id: listing.id,
        image_url: publicUrl,
        is_primary: true
      }]);

      alert("Listing Posted successfully!");
      navigate('/dashboard/student');
    } catch (err) {
      alert("Error: " + err.message);
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
        <button className="back-btn" onClick={() => navigate(-1)} type="button">
          <ArrowLeft size={20} /> Back
        </button>
      </nav>

      <section className="create-card-container">
        <form className="listing-form-content" onSubmit={handleSubmit}>
          <header className="image-upload-box">
            <input type="file" id="pic-upload" accept="image/*" onChange={handleImageChange} hidden />
            <label htmlFor="pic-upload" className="upload-trigger">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="upload-preview" />
              ) : (
                <article className="placeholder-content">
                  <Camera size={48} />
                  <p>Add Picture</p>
                </article>
              )}
            </label>
          </header>

          <fieldset className="form-fields-grid">
            <article className="input-field full-width">
              <label>Title</label>
              <input 
                type="text" required 
                placeholder="e.g. Calculus Textbook"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})} 
              />
            </article>

            <article className="input-field">
              <label>Category</label>
              <select 
                required 
                value={formData.category_id}
                onChange={(e) => setFormData({...formData, category_id: e.target.value})}
              >
                <option value="">Select Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </article>

            <article className="input-field">
              <label>Condition</label>
              <select 
                value={formData.condition} 
                onChange={(e) => setFormData({...formData, condition: e.target.value})}
              >
                {conditionOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </article>

            <article className="input-field">
              <label>Price (R)</label>
              <input 
                type="number" required 
                placeholder="0.00"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})} 
              />

              {/* --- LIVE SA DATA SUGGESTION BOX --- */}
              {suggestion && (
                <div className="price-suggestion-tip">
                  <nav className="tip-header">
                    <Lightbulb size={14} color="#f3a91e" />
                    <span>UniMart Smart Price</span>
                  </nav>
                  <p>Suggested: <strong>R {suggestion.price}</strong></p>
                  <button 
                    type="button" 
                    className="use-price-btn"
                    onClick={() => setFormData({...formData, price: suggestion.price})}
                  >
                    Apply Suggestion
                  </button>
                  <small>Informed by {suggestion.source}</small>
                </div>
              )}
              {isFetchingSuggestion && <p className="fetching-text">Calculating market data...</p>}
            </article>

            <article className="input-field">
              <label>Campus</label>
              <select 
                value={formData.campus} 
                onChange={(e) => setFormData({...formData, campus: e.target.value})}
              >
                {campusOptions.map(campus => <option key={campus} value={campus}>{campus}</option>)}
              </select>
            </article>

            <article className="input-field full-width">
              <label>Description</label>
              <textarea 
                required rows="3" 
                placeholder="Details about your item..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              ></textarea>
            </article>

            <nav className="input-field radio-group">
               <label>Type:</label>
               <article className="radio-options">
                  <label>
                    <input 
                      type="radio" name="type" value="sale" 
                      checked={formData.listing_type === 'sale'}
                      onChange={() => setFormData({...formData, listing_type: 'sale'})}
                    /> Sale
                  </label>
                  <label>
                    <input 
                      type="radio" name="type" value="trade" 
                      checked={formData.listing_type === 'trade'}
                      onChange={() => setFormData({...formData, listing_type: 'trade'})}
                    /> Trade
                  </label>
               </article>
            </nav>
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