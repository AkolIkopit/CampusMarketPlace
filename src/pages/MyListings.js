import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { ArrowLeft, Trash2, Loader2, PackageOpen } from 'lucide-react';
import './MyListings.css';

const MyListings = () => {
  const navigate = useNavigate();
  const [myItems, setMyItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchMyListings();
  }, []);

  const fetchMyListings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('listings')
        .select(`*, categories(name), listing_images(image_url)`)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyItems(data || []);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (listingId, imageUrl) => {
    if (!window.confirm("Are you sure you want to delete this listing?")) return;
    
    setDeletingId(listingId);
    try {
      // 1. Delete from Database (Foreign keys handle listing_images rows)
      const { error: dbError } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId);

      if (dbError) throw dbError;

      // 2. Delete from Storage (listing-Images bucket)
      if (imageUrl) {
        // Extract the filename from the URL
        const parts = imageUrl.split('listing-Images/');
        if (parts.length > 1) {
          const filePath = parts[1];
          await supabase.storage.from('listing-Images').remove([filePath]);
        }
      }

      setMyItems(myItems.filter(item => item.id !== listingId));
    } catch (err) {
      alert("Delete failed: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="my-listings-page">
      <header className="management-header">
        <button className="back-to-dash" onClick={() => navigate('/dashboard/student')}>
          <ArrowLeft size={20} /> Dashboard
        </button>
        <h1>Manage My Listings</h1>
      </header>

      {loading ? (
        <section className="center-loader"><Loader2 className="spinner" /></section>
      ) : myItems.length === 0 ? (
        <section className="no-listings">
          <PackageOpen size={60} />
          <h2>You don&apos;t have any active listings.</h2>
          <button onClick={() => navigate('/create-listing')}>Create a Listing</button>
        </section>
      ) : (
        <section className="manage-grid">
          {myItems.map(item => (
            <article key={item.id} className="manage-item-card">
              <figure className="manage-item-img">
                <img src={item.listing_images[0]?.image_url || '/placeholder.jpg'} alt="" />
              </figure>
              
              <section className="manage-item-details">
                <header>
                  <mark className="item-cat-badge">{item.categories?.name}</mark>
                  <h3>{item.title}</h3>
                  <p className="item-price-tag">R {item.price}</p>
                </header>

                <footer className="manage-item-actions">
                  <button 
                    className="item-delete-btn" 
                    onClick={() => handleDelete(item.id, item.listing_images[0]?.image_url)}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? <Loader2 className="spinner" size={16} /> : <Trash2 size={18} />}
                    Delete Forever
                  </button>
                </footer>
              </section>
            </article>
          ))}
        </section>
      )}
    </main>
  );
};

export default MyListings;