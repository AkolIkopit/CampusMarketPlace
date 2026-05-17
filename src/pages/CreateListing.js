import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Camera, Loader2 } from 'lucide-react';
import { supabase } from '../supabase';
import LoadingScreen from '../components/LoadingScreen';
import './CreateListing.css';

const LISTING_IMAGE_BUCKETS = ['listing-Images', 'listing-images', 'listing_images'];

const CreateListing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const listingId = searchParams.get('listing');
  const isEditMode = Boolean(listingId);
  const resolvedListingId = (() => {
    if (!listingId) return null;
    const numericId = Number(listingId);
    return Number.isInteger(numericId) ? numericId : listingId;
  })();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    description: '',
    price: '',
    listing_type: 'sale',
    condition: 'Good',
    campus: 'Main Campus'
  });

  const conditionOptions = ['New', 'Like New', 'Good', 'Fair', 'Poor'];
  const campusOptions = ['Main Campus', 'Education Campus', 'Med Campus'];
  const listingTypeOptions = [
    { value: 'sale', label: 'Sale' },
    { value: 'trade', label: 'Trade' },
    { value: 'either', label: 'Either' }
  ];

  const pageTitle = isEditMode ? 'Edit Listing' : 'Create Listing';
  const submitLabel = isEditMode ? 'Update Listing' : 'POST';

  useEffect(() => {
    const loadForm = async () => {
      try {
        const { data: categoriesData } = await supabase.from('categories').select('*');
        setCategories(categoriesData || []);

        if (!isEditMode) return;

        const { data: listingData, error } = await supabase
          .from('listings')
          .select(`*, listing_images(image_url, is_primary)`)
          .eq('id', resolvedListingId)
          .maybeSingle();

        if (error || !listingData) {
          setLoadError('Unable to load listing for editing.');
          return;
        }

        setFormData({
          title: listingData.title || '',
          category_id: listingData.category_id?.toString() || '',
          description: listingData.description || '',
          price: listingData.price?.toString() || '',
          listing_type: listingData.listing_type || 'sale',
          condition: listingData.condition || 'Good',
          campus: listingData.location || 'Main Campus'
        });

        const primaryImage = listingData.listing_images?.find((img) => img.is_primary) || listingData.listing_images?.[0];
        const imageUrl = primaryImage?.image_url || null;
        setExistingImageUrl(imageUrl);
        setImagePreview(imageUrl);
      } catch (err) {
        setLoadError(err?.message || 'Unable to load listing form.');
      } finally {
        setLoading(false);
      }
    };

    loadForm();
  }, [isEditMode, listingId]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (userId, targetListingId) => {
    const fileExt = imageFile.name.split('.').pop();
    const filePath = `${userId}/${userId}-${Math.random()}.${fileExt}`;

    // Ensure the new image becomes the only primary image for this listing.
    const { error: resetError } = await supabase
      .from('listing_images')
      .update({ is_primary: false })
      .eq('listing_id', targetListingId);
    if (resetError) throw resetError;

    let publicUrl = null;
    let lastError = null;
    let bucketNotFound = false;

    for (const bucketName of LISTING_IMAGE_BUCKETS) {
      const storage = supabase.storage.from(bucketName);
      const { error: uploadError } = await storage.upload(filePath, imageFile);
      if (uploadError) {
        lastError = uploadError;
        if (uploadError.statusCode === 404 || uploadError.message?.includes('Bucket not found')) {
          bucketNotFound = true;
        }
        continue;
      }

      const { data: publicData, error: publicError } = await storage.getPublicUrl(filePath);
      if (publicError) {
        lastError = publicError;
        continue;
      }

      if (publicData?.publicUrl) {
        publicUrl = publicData.publicUrl;
        break;
      }

      lastError = new Error(`Unable to resolve public URL for bucket ${bucketName}.`);
    }

    if (!publicUrl) {
      if (bucketNotFound) {
        let bucketListMessage = '';
        try {
          const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
          if (bucketError) {
            console.warn('Unable to list storage buckets:', bucketError);
          } else {
            bucketListMessage = ` Available buckets: ${buckets.map((bucket) => bucket.name).join(', ') || 'none'}.`;
          }
        } catch (error) {
          console.warn('Error listing storage buckets:', error);
        }
        throw new Error(`Unable to upload listing image because no storage bucket was found. Create a Supabase Storage bucket named "listing-Images" and try again.${bucketListMessage}`);
      }
      throw lastError || new Error('Unable to upload listing image.');
    }

    const { error: insertError } = await supabase.from('listing_images').insert([
      { listing_id: targetListingId, image_url: publicUrl, is_primary: true }
    ]);
    if (insertError) throw insertError;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!imageFile && !existingImageUrl) {
      window.alert('Please add a picture!');
      return;
    }

    if (!formData.category_id) {
      window.alert('Please select a category!');
      return;
    }

    if (!formData.title.trim()) {
      window.alert('Please enter a title!');
      return;
    }

    if (!formData.description.trim()) {
      window.alert('Please add details about your item!');
      return;
    }

    if (!formData.price || Number(formData.price) <= 0) {
      window.alert('Please enter a valid price!');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current authenticated user:', user);
      if (!user) throw new Error('You must be signed in to post a listing.');

      const listingPayloadBase = {
        title: formData.title.trim(),
        category_id: Number(formData.category_id),
        description: formData.description.trim(),
        price: Number(formData.price),
        listing_type: formData.listing_type,
        condition: formData.condition,
        location: formData.campus,
        status: 'active'
      };
      const listingPayload = isEditMode ? listingPayloadBase : { ...listingPayloadBase, seller_id: user.id };

      if (isEditMode) {
          // fetch existing listing to verify ownership and current state
          const { data: existingListing, error: existingError } = await supabase
            .from('listings')
            .select('id, seller_id')
            .eq('id', resolvedListingId)
            .maybeSingle();

          console.log('Supabase existing listing:', { existingListing, existingError });

          if (existingError) {
            throw existingError;
          }

          if (!existingListing) {
            throw new Error('Listing not found. It may have been removed.');
          }

          // ownership check — common RLS cause for silent update failures
          if (existingListing.seller_id && existingListing.seller_id !== user.id) {
            throw new Error('You are not authorized to update this listing.');
          }

          const { data: updatedListing, error: updateError } = await supabase
            .from('listings')
            .update(listingPayload)
            .eq('id', resolvedListingId)
            .select();

          console.log('Supabase update result:', { updatedListing, updateError });

          if (updateError) {
            // surface server error text for debugging
            throw updateError;
          }

          if (!updatedListing || (Array.isArray(updatedListing) && updatedListing.length === 0)) {
            const msg = (updateError && updateError.message) || 'No rows were updated.';
            throw new Error(`Listing update failed: ${msg}`);
          }

        if (imageFile) {
          await uploadImage(user.id, resolvedListingId);
        }

        window.alert('Listing updated successfully!');
        navigate('/my-listings');
        return;
      }

      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert([listingPayload])
        .select('id')
        .single();

      if (listingError || !listing?.id) throw listingError || new Error('Listing creation failed.');

      await uploadImage(user.id, listing.id);
      window.alert('Listing Posted successfully!');
      navigate('/dashboard/student');
    } catch (err) {
      window.alert(`Error: ${err?.message || 'Something went wrong.'}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && categories.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <main className="create-listing-page">
      <section className="aurora-bg" aria-hidden="true">
        <hr className="orb orb-1" /><hr className="orb orb-2" /><hr className="orb orb-3" />
      </section>

      <nav className="top-nav-bar">
        <button className="back-btn" onClick={() => navigate(isEditMode ? '/my-listings' : '/dashboard/student')} type="button">
          <ArrowLeft size={20} /> Back
        </button>
      </nav>

      <section className="create-card-container">
        <header className="page-header">
          <h1>{pageTitle}</h1>
          <p>{isEditMode ? 'Update your listing details and choose a new image if needed.' : 'Post a new student marketplace listing with photo, category, condition, and price.'}</p>
        </header>

        {loadError ? (
          <div style={{ color: 'white', marginTop: '24px' }}>{loadError}</div>
        ) : (
          <form className="listing-form-content" onSubmit={handleSubmit}>
            <header className="image-upload-box">
              <input type="file" id="pic-upload" accept="image/*" onChange={handleImageChange} hidden />
              <label htmlFor="pic-upload" className="upload-trigger">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="upload-preview"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', display: 'block' }}
                  />
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
                  type="text"
                  placeholder="e.g. Calculus Textbook"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </article>

              <article className="input-field">
                <label>Category</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </article>

              <article className="input-field">
                <label>Condition</label>
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                >
                  {conditionOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </article>

              <article className="input-field">
                <label>Price (R)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  min="0"
                  step="0.01"
                />
              </article>

              <article className="input-field">
                <label>Campus</label>
                <select
                  value={formData.campus}
                  onChange={(e) => setFormData({ ...formData, campus: e.target.value })}
                >
                  {campusOptions.map((campus) => (
                    <option key={campus} value={campus}>{campus}</option>
                  ))}
                </select>
              </article>

              <article className="input-field full-width">
                <label>Listing type</label>
                <section className="radio-options">
                  {listingTypeOptions.map((option) => (
                    <label key={option.value}>
                      <input
                        type="radio"
                        name="listing_type"
                        value={option.value}
                        checked={formData.listing_type === option.value}
                        onChange={(e) => setFormData({ ...formData, listing_type: e.target.value })}
                      />
                      {option.label}
                    </label>
                  ))}
                </section>
              </article>

              <article className="input-field full-width">
                <label>Description</label>
                <textarea
                  rows="4"
                  placeholder="Details about your item..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </article>

              <button type="submit" className="post-btn" disabled={loading}>
                {loading ? <Loader2 className="spinner" /> : submitLabel}
              </button>
            </fieldset>
          </form>
        )}
      </section>
    </main>
  );
};

export default CreateListing;
