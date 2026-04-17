import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { ArrowLeft, MessageCircle, ShoppingCart, User, Star, MapPin, Loader2 } from 'lucide-react';
import './ListingDetail.css';

const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };

    fetchCurrentUser();

    const fetchListingDetails = async () => {
      const { data, error } = await supabase
        .from('listings')
        .select(`*, profiles!inner(id, full_name, avatar_url, campus, bio), categories(name), listing_images(image_url)`)
        .eq('id', id)
        .single();

      if (error) { navigate('/dashboard/student'); } 
      else { setListing(data); }
      setLoading(false);
    };
    fetchListingDetails();
  }, [id, navigate]);

  const isOwnListing = Boolean(currentUserId && listing?.profiles?.id === currentUserId);

  if (loading) return <main className="detail-loading-screen"><Loader2 className="spinner" /></main>;

  return (
    <main className="listing-detail-page">
      <nav className="detail-top-nav">
        <button className="detail-back-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /> Back to Market</button>
      </nav>

      <section className="detail-layout">
        <figure className="detail-image-gallery">
          <img src={listing.listing_images[0]?.image_url || '/placeholder.jpg'} alt={listing.title} />
        </figure>

        <section className="detail-content">
          <header className="product-header">
            <mark className="product-category-tag">{listing.categories.name}</mark>
            <h1>{listing.title}</h1>
            <p className="product-price">R {listing.price}</p>
          </header>

          <article className="product-description">
            <h3>Description</h3>
            <p>{listing.description || "The student has not provided a description for this item."}</p>
          </article>

          <section className="seller-profile-card">
            <header className="seller-card-top">
              {listing.profiles.avatar_url ? (
                <img src={listing.profiles.avatar_url} alt="seller" className="seller-img" />
              ) : (
                <figure className="seller-img-placeholder"><User size={24} /></figure>
              )}
              <div className="seller-meta">
                <h4>{listing.profiles.full_name}</h4>
                <div className="rating-row">
                  <Star size={14} fill="#f3a91e" color="#f3a91e" />
                  <span>4.9 (Verified Student)</span>
                </div>
              </div>
            </header>
            <footer className="seller-card-footer">
              <MapPin size={14} />
              <p>{listing.profiles.campus}</p>
            </footer>
          </section>

          <footer className="purchase-actions">
            <button
              className="msg-seller-btn"
              onClick={() =>
                navigate(
                  `/messages?user=${encodeURIComponent(listing.profiles.id)}&name=${encodeURIComponent(
                    listing.profiles.full_name
                  )}&item=${encodeURIComponent(listing.title)}&listing=${encodeURIComponent(listing.id)}`
                )
              }
              disabled={isOwnListing}
            >
              <MessageCircle size={20} /> {isOwnListing ? 'Your Listing' : 'Message Seller'}
            </button>
            <button className="add-cart-btn">
              <ShoppingCart size={20} /> Add to Cart
            </button>
          </footer>
        </section>
      </section>
    </main>
  );
};

export default ListingDetail;