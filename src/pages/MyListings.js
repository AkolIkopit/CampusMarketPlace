import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { notifyError, notifySuccess } from '../toast';
import { ArrowLeft, Trash2, Loader2, PackageOpen, User, MessageSquare, Edit3 } from 'lucide-react';
import './MyListings.css';

const MyListings = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchUserListings();
  }, []);

  const fetchUserListings = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('listings')
      .select(`
        *, 
        categories(name), 
        listing_images(image_url, is_primary),
        reviews(
          id, 
          rating, 
          comment, 
          created_at,
          reviewer:profiles!reviewer_id(full_name, avatar_url)
        )
      `)
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });

    if (!error) setListings(data || []);
    setLoading(false);
  };

  const handleDeleteClick = (e, item) => {
    e.stopPropagation();
    setPendingDelete(item);
  };

  const cancelDelete = (e) => {
    e?.stopPropagation();
    setPendingDelete(null);
  };

  const confirmDelete = async (e) => {
    e?.stopPropagation();
    if (!pendingDelete) return;

    setDeleteLoading(true);
    const { error } = await supabase.from('listings').delete().eq('id', pendingDelete.id);
    setDeleteLoading(false);

    if (!error) {
      setListings((current) => current.filter((l) => l.id !== pendingDelete.id));
      notifySuccess(`Deleted ${pendingDelete.title}.`);
      setPendingDelete(null);
    } else {
      notifyError(error.message);
    }
  };

  return (
    <main className="my-listings-page">
      <section className="aurora-bg" aria-hidden="true">
        <hr className="orb orb-1" /><hr className="orb orb-2" /><hr className="orb orb-3" />
      </section>

      <nav className="top-nav-bar">
        <button className="back-btn" onClick={() => navigate('/dashboard/student')}>
          <ArrowLeft size={20} /> Back to Dashboard
        </button>
      </nav>

      <header className="page-header">
        <h1>My Listings</h1>
        <p>Click a card to view full details and reviews, or use the edit or delete buttons to manage a listing.</p>
      </header>

      {loading ? (
        <figure className="loading-state"><Loader2 className="spinner" /></figure>
      ) : listings.length === 0 ? (
        <section className="empty-state">
          <PackageOpen size={64} />
          <h2>You haven't posted anything yet.</h2>
          <button onClick={() => navigate('/create-listing')}>Create your first post</button>
        </section>
      ) : (
        <section className="my-listings-grid">
          {listings.map((item) => (
            <article
              key={item.id}
              className="my-listing-card"
              onClick={() => navigate(`/listing/${item.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <figure className="listing-img-box">
                {(() => {
                  const primaryImage = item.listing_images?.find((img) => img.is_primary) || item.listing_images?.[0];
                  return (
                    <img
                      src={primaryImage?.image_url || '/placeholder.jpg'}
                      alt={item.title}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', display: 'block' }}
                    />
                  );
                })()}
                {item.status === 'sold_out' && (
                  <span className="my-listing-sold-out-badge">SOLD OUT</span>
                )}
                <button
                  className="edit-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/create-listing?listing=${item.id}`);
                  }}
                  title="Edit Listing"
                >
                  <Edit3 size={18} />
                </button>
                <button
                  className="delete-btn"
                  onClick={(e) => handleDeleteClick(e, item)}
                  title="Delete Listing"
                >
                  <Trash2 size={18} />
                </button>
              </figure>

              <section className="listing-details">
                <header className="listing-header-main">
                  <mark className="listing-cat">{item.categories?.name}</mark>
                  <h3>{item.title}</h3>
                  <p className="listing-price">R {item.price}</p>
                  {item.quantity != null && (
                    <p
                      className="listing-qty-label"
                      style={item.status === 'sold_out' ? { color: '#e63946' } : {}}
                    >
                      {item.status === 'sold_out' ? 'Out of stock' : `${item.quantity} in stock`}
                    </p>
                  )}
                </header>

                <footer className="listing-reviews-summary">
                  <header className="rev-summary-header">
                    <MessageSquare size={14} />
                    <h4>{item.reviews?.length || 0} Reviews</h4>
                  </header>

                  {item.reviews && item.reviews.length > 0 ? (
                    <ul className="compact-rev-list">
                      {item.reviews.slice(0, 2).map((rev) => (
                        <li key={rev.id} className="compact-rev-item">
                          <header className="comp-rev-user">
                            {rev.reviewer.avatar_url ? (
                              <img src={rev.reviewer.avatar_url} alt="" className="tiny-avatar" />
                            ) : (
                              <figure className="tiny-placeholder"><User size={10} /></figure>
                            )}
                            <strong>{rev.reviewer.full_name.split(' ')[0]}</strong>
                          </header>
                          <p className="comp-rev-text">"{rev.comment}"</p>
                        </li>
                      ))}
                      {item.reviews.length > 2 && (
                        <p className="more-revs-hint">+{item.reviews.length - 2} more reviews...</p>
                      )}
                    </ul>
                  ) : (
                    <p className="no-rev-text">No feedback yet.</p>
                  )}
                </footer>
              </section>
            </article>
          ))}
        </section>
      )}

      {pendingDelete && (
        <div className="delete-confirm-backdrop" onClick={cancelDelete}>
          <div className="delete-confirm-card" onClick={(event) => event.stopPropagation()}>
            <h2>Confirm delete</h2>
            <p>Are you sure you want to delete "{pendingDelete.title}" permanently?</p>
            <div className="delete-confirm-actions">
              <button className="btn-cancel-delete" onClick={cancelDelete} type="button">Cancel</button>
              <button className="btn-confirm-delete" onClick={confirmDelete} type="button" disabled={deleteLoading}>
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default MyListings;
