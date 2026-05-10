import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import {
  ArrowLeft, MessageCircle, ShoppingCart, User,
  Star, MapPin, Loader2, Send
} from 'lucide-react';
import './ListingDetail.css';

const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);

    // FIX: select includes 'location' (the listing's specific campus)
    const { data: listData } = await supabase
      .from('listings')
      .select(`*, profiles!inner(id, full_name, avatar_url, campus), categories(name), listing_images(image_url)`)
      .eq('id', id)
      .single();

    const { data: revData } = await supabase
      .from('reviews')
      .select(`*, reviewer:profiles!reviewer_id(full_name, avatar_url)`)
      .eq('listing_id', id)
      .order('created_at', { ascending: false });

    if (listData) setListing(listData);
    if (revData) setReviews(revData);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('reviews').insert([{
        listing_id: id, reviewer_id: user.id, reviewee_id: listing.seller_id, rating, comment
      }]);
      if (!error) { setComment(""); setShowForm(false); await fetchAllData(); alert("Review posted!"); }
    } finally { setSubmitting(false); }
  };

  const isOwnListing = Boolean(currentUserId && listing?.seller_id === currentUserId);

  if (loading) return <main className="detail-loading-screen"><Loader2 className="spinner" /></main>;
  if (!listing) return <main className="detail-loading-screen"><h2>Listing not found.</h2></main>;

  return (
    <main className="listing-detail-page">
      <section className="aurora-bg" aria-hidden="true"><hr className="orb orb-1" /><hr className="orb orb-2" /><hr className="orb orb-3" /></section>
      <nav className="detail-top-nav">
        <button className="detail-back-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /> Back</button>
      </nav>

      <section className="detail-layout">
        <section className="product-essential-grid">
          <figure className="detail-image-gallery"><img src={listing.listing_images[0]?.image_url || '/placeholder.jpg'} alt={listing.title} /></figure>
          <section className="detail-content">
            <header className="product-header">
              <mark className="product-category-tag">{listing.categories.name}</mark>
              <h1>{listing.title}</h1>
              <p className="product-price">R {listing.price}</p>
            </header>
            <article className="product-description"><h3>Description</h3><p>{listing.description || "No description provided."}</p></article>
            
            <section className="seller-profile-card">
              <header className="seller-card-top">
                {listing.profiles.avatar_url ? <img src={listing.profiles.avatar_url} alt="" className="seller-img" /> : <figure className="seller-img-placeholder"><User size={24} /></figure>}
                <nav className="seller-meta">
                  <h4>{listing.profiles.full_name}</h4>
                  {/* FIX: Shows listing.location (Drop-off campus) instead of profiles.campus (Seller Home campus) */}
                  <p className="seller-campus-text"><MapPin size={12} /> {listing.location || 'Main Campus'}</p>
                </nav>
              </header>
              <footer className="purchase-actions">
                <button
                  className="msg-seller-btn"
                  onClick={() => navigate(`/messages?${new URLSearchParams({
                    user: listing.seller_id,
                    listing: id,
                    name: listing.profiles.full_name,
                    item: listing.title,
                  }).toString()}`)}
                  disabled={isOwnListing}
                >
                  <MessageCircle size={18} /> {isOwnListing ? 'Your Listing' : 'Message'}
                </button>
                <button className="add-cart-btn"><ShoppingCart size={18} /> Add to Cart</button>
              </footer>
            </section>
          </section>
        </section>

        <section className="reviews-container">
          <header className="section-header"><h2>Reviews & Feedback</h2><button className="add-review-toggle" onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "Write a Review"}</button></header>
          {showForm && (
            <form className="review-form-box" onSubmit={handleReviewSubmit}>
              <fieldset className="rating-selector"><legend>Rating</legend><nav className="star-input-group">{[1, 2, 3, 4, 5].map((num) => (<button key={num} type="button" className={num <= rating ? "star-btn active" : "star-btn"} onClick={() => setRating(num)}><Star size={24} fill={num <= rating ? "#f3a91e" : "none"} /></button>))}</nav></fieldset>
              <fieldset className="comment-input-area"><legend>Feedback</legend><textarea required placeholder="Experience with seller..." value={comment} onChange={(e) => setComment(e.target.value)}></textarea></fieldset>
              <button type="submit" className="submit-review-btn" disabled={submitting}>{submitting ? <Loader2 className="spinner" /> : <><Send size={18} /> Post</>}</button>
            </form>
          )}
          <ul className="reviews-list">
            {reviews.length === 0 ? <article className="no-reviews"><p>No reviews yet.</p></article> : reviews.map(rev => (
              <li key={rev.id} className="review-item"><article className="review-card"><header className="reviewer-info">
                {rev.reviewer.avatar_url ? <img src={rev.reviewer.avatar_url} alt="" className="reviewer-thumb" /> : <figure className="reviewer-placeholder"><User size={16} /></figure>}
                <nav className="reviewer-name-group"><strong>{rev.reviewer.full_name}</strong><time>{new Date(rev.created_at).toLocaleDateString()}</time></nav>
                <figure className="review-stars">{[...Array(5)].map((_, i) => (<Star key={i} size={12} fill={i < rev.rating ? "#f3a91e" : "none"} color={i < rev.rating ? "#f3a91e" : "#ddd"} />))}</figure></header>
                <p className="review-text">{rev.comment}</p></article></li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
};

export default ListingDetail;