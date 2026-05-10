import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Trash2, Flag, CheckCircle, 
  Search, Package, AlertTriangle 
} from 'lucide-react';
import './ManageListings.css';

export default function ManageListings() {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('listings')
      .select(`*, profiles:seller_id(full_name)`)
      .order('created_at', { ascending: false });

    if (error) console.error("Fetch Error:", error.message);
    else setListings(data || []);
    setLoading(false);
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) {
        // This will tell us if RLS is blocking the update
        alert("Database Error: " + error.message);
        return;
      }
      
      // Update local state so it changes on screen immediately
      setListings(listings.map(l => l.id === id ? { ...l, status: newStatus } : l));
      console.log(`Listing ${id} successfully set to ${newStatus}`);
    } catch (err) {
      console.error("Critical Error:", err);
    }
  };

  const deleteListing = async (id) => {
    if (!window.confirm("Permanently delete this listing from the database?")) return;
    const { error } = await supabase.from('listings').delete().eq('id', id);
    if (error) alert("Delete failed: " + error.message);
    else setListings(listings.filter(l => l.id !== id));
  };

  const filteredListings = listings.filter(l => 
    l.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="dashboard-container">
      <section className="aurora-bg" aria-hidden="true">
        <hr className="orb orb-1" /><hr className="orb orb-2" /><hr className="orb orb-3" />
      </section>

      <header className="main-header admin-navy-header">
        <nav className="header-nav">
          <button className="back-btn-gold" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} /> Back
          </button>
          <section className="logo-section">
            <h1 className="logo-text gold-text">Manage Listings</h1>
          </section>
          <div className="admin-search-box">
             <Search size={18} color="#f0a500" />
             <input 
                type="text" 
                placeholder="Search items..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
        </nav>
      </header>

      <section className="listings-admin-content">
        <div className="admin-stats-summary">
            <div className="stat-pill"><Package size={16} /> Total: {listings.length}</div>
            <div className="stat-pill flagged"><AlertTriangle size={16} /> Flagged: {listings.filter(l => l.status === 'flagged').length}</div>
        </div>

        {loading ? (
          <div className="loading-container"><p>Fetching marketplace data...</p></div>
        ) : (
          <div className="admin-table-card">
            <table className="manage-table">
              <thead>
                <tr>
                  <th>Marketplace Item</th>
                  <th>Seller Name</th>
                  <th>Current Status</th>
                  <th style={{ textAlign: 'center' }}>Admin Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredListings.map(item => (
                  <tr key={item.id} className={item.status === 'flagged' ? 'row-is-flagged' : ''}>
                    <td>
                        <div className="item-cell">
                            <span className="item-title">{item.title}</span>
                            <span className="item-price">R {item.price}</span>
                        </div>
                    </td>
                    <td className="seller-cell">{item.profiles?.full_name}</td>
                    <td>
                      <span className={`status-tag ${item.status}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="action-cell">
                      {item.status === 'active' ? (
                        <button 
                            className="btn-action-flag" 
                            onClick={() => updateStatus(item.id, 'flagged')} 
                            title="Flag as Unsafe"
                        >
                          <Flag size={20} fill="#e63946" stroke="#e63946" />
                        </button>
                      ) : (
                        <button 
                            className="btn-action-restore" 
                            onClick={() => updateStatus(item.id, 'active')} 
                            title="Restore to Market"
                        >
                          <CheckCircle size={20} color="#27ae60" />
                        </button>
                      )}
                      <button 
                        className="btn-action-delete" 
                        onClick={() => deleteListing(item.id)} 
                      >
                        <Trash2 size={20} color="#999" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}