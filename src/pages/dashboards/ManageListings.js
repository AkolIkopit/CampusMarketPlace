import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { notifySuccess } from '../../toast';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Trash2, Flag, CheckCircle, 
  Search, User, MessageSquare, X, Info, AlertTriangle 
} from 'lucide-react';
import LoadingScreen from '../../components/LoadingScreen';
import './ManageListings.css';

export default function ManageListings() {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState('active'); // 'active' or 'flagged'
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Tab Counter States
  const [activeTotal, setActiveTotal] = useState(0);
  const [flaggedTotal, setFlaggedTotal] = useState(0);

  // Form & Action States
  const [expandedId, setExpandedId] = useState(null);
  const [actionType, setActionType] = useState(null); // 'flag' or 'delete'
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  
  // Detail & Audit States
  const [showAuditId, setShowAuditId] = useState(null);
  const [auditDetails, setAuditDetails] = useState({}); // Stores Admin Name + Reason for flagged items
  const [studentAppeals, setStudentAppeals] = useState({}); // Stores messages from students
  
  // Custom Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({ 
    show: false, 
    title: "", 
    item: null, 
    type: "" 
  });

  useEffect(() => {
    fetchData();
    updateTabCounts();
  }, [currentTab]);

  // Main data fetcher
  const fetchData = async () => {
    setLoading(true);
    setExpandedId(null);
    setShowAuditId(null);

    // 1. Fetch Listings based on status
    const { data: listingsData, error: listingsError } = await supabase
      .from('listings')
      .select(`
        *, 
        profiles:seller_id(id, full_name, avatar_url, is_suspended),
        listing_images(image_url)
      `)
      .eq('status', currentTab)
      .order('created_at', { ascending: false });

    if (listingsError) {
      console.error("Error fetching listings:", listingsError);
    } else {
      setListings(listingsData || []);

      // 2. If we are in the Flagged tab, fetch the "Who flagged this" info and student appeals
      if (currentTab === 'flagged' && listingsData?.length > 0) {
        const itemIds = listingsData.map(item => item.id);
        const sellerIds = listingsData.map(item => item.seller_id);

        // Fetch Moderation Logs to see which Admin did the flagging
        const { data: logs } = await supabase
          .from('moderation_logs')
          .select('target_id, reason_category, extra_description, profiles:admin_id(full_name)')
          .in('target_id', itemIds)
          .eq('action_taken', 'flagged');

        const logMap = {};
        logs?.forEach(log => {
          logMap[log.target_id] = {
            adminName: log.profiles?.full_name || "Authorized Admin",
            reason: log.reason_category,
            notes: log.extra_description
          };
        });
        setAuditDetails(logMap);

        // Fetch Student Appeals
        const { data: appeals } = await supabase
          .from('appeals')
          .select('user_id, student_explanation')
          .in('user_id', sellerIds);

        const appealMap = {};
        appeals?.forEach(app => {
          appealMap[app.user_id] = app.student_explanation;
        });
        setStudentAppeals(appealMap);
      }
    }
    setLoading(false);
  };

  // Helper to keep tab numbers updated
  const updateTabCounts = async () => {
    const { count: activeCount } = await supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active');
    const { count: flaggedCount } = await supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'flagged');
    setActiveTotal(activeCount || 0);
    setFlaggedTotal(flaggedCount || 0);
  };

  // Logic to handle 4 flags -> Auto Suspension
  const checkAutoSuspension = async (sellerId, sellerName) => {
    const { count } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .eq('status', 'flagged');

    if (count >= 4) {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_suspended: true, 
          suspension_reason: "Automated: Account reached 4 flagged listings." 
        })
        .eq('id', sellerId);
      
      if (!error) notifySuccess(`Suspended: ${sellerName} has been locked out.`);
    }
  };

  const toggleExpand = (id, type) => {
    if (expandedId === id && actionType === type) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      setActionType(type);
    }
    setReason("");
    setDescription("");
  };

  // Opens our custom Confirmation Card
  const openConfirmModal = (item, type) => {
    setConfirmModal({
      show: true,
      item: item,
      type: type,
      title: type === 'delete' ? "Confirm Permanent Delete" : type === 'flag' ? "Confirm Listing Flag" : "Confirm Restoration"
    });
  };

  const executeAction = async () => {
    const { item, type } = confirmModal;
    const { data: { user: admin } } = await supabase.auth.getUser();

    // 1. Log to Moderation History (Ghost Record for Analytics)
    if (type !== 'restore') {
        await supabase.from('moderation_logs').insert([{
            admin_id: admin.id,
            target_id: item.id,
            target_type: 'listing',
            target_name: item.title,
            action_taken: type === 'flag' ? 'flagged' : 'deleted',
            reason_category: reason || "Standard Restoration",
            extra_description: description || "No additional notes."
        }]);
    }

    // 2. Perform Database Update
    if (type === 'flag') {
        await supabase.from('listings').update({ 
            status: 'flagged',
            flag_reason: reason,
            flag_details: description
        }).eq('id', item.id);
        await checkAutoSuspension(item.seller_id, item.profiles?.full_name);
    } 
    else if (type === 'delete') {
        await supabase.from('listings').delete().eq('id', item.id);
    } 
    else if (type === 'restore') {
        await supabase.from('listings').update({ 
            status: 'active', 
            flag_reason: null, 
            flag_details: null 
        }).eq('id', item.id);
    }

    setConfirmModal({ show: false });
    setExpandedId(null);
    fetchData();
    updateTabCounts();
  };

  if (loading) return <LoadingScreen />;

  const filtered = listings.filter(l => l.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <main className="dashboard-container mod-white-theme">
      <section className="aurora-bg" aria-hidden="true"><hr className="orb orb-1" /><hr className="orb orb-2" /><hr className="orb orb-3" /></section>

      <header className="main-header glass-header">
        <nav className="header-nav">
          <button className="back-btn-gold" onClick={() => navigate(-1)}><ArrowLeft size={20} /> Back</button>
          
          <div className="tab-switcher">
            <button className={`tab-btn ${currentTab === 'active' ? 'active-solid' : 'inactive-faded'}`} onClick={() => setCurrentTab('active')}>
                Active <span className="tab-count">{activeTotal}</span>
            </button>
            <button className={`tab-btn ${currentTab === 'flagged' ? 'active-solid' : 'inactive-faded'}`} onClick={() => setCurrentTab('flagged')}>
                Flagged <span className="tab-count">{flaggedTotal}</span>
            </button>
          </div>

          <div className="admin-search-giant">
             <Search size={22} color="#f0a500" />
             <input type="text" placeholder="Search moderation history..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </nav>
      </header>

      <section className="centered-mod-layout">
        <div className="mod-feed-column">
          {filtered.length === 0 ? (
              <div className="empty-state-big">EMPTY</div>
          ) : (
            filtered.map(item => (
              <article key={item.id} className={`mod-card-white ${expandedId === item.id ? 'active-expansion' : ''}`}>
                
                <div className="card-main-content">
                  {/* USER CORNER PIX */}
                  <div className="corner-user-badge">
                      {item.profiles?.avatar_url ? (
                        <img src={item.profiles.avatar_url} className="user-corner-img" alt="User" />
                      ) : (
                        <div className="user-corner-icon"><User size={18} /></div>
                      )}
                  </div>

                  <img src={item.listing_images?.[0]?.image_url || '/placeholder.jpg'} className="item-thumbnail" alt="" />
                  
                  <div className="item-details">
                    <div className="info-line">
                        <span className="label-navy">Username:</span> 
                        <span className="value-navy">{item.profiles?.full_name}</span>
                        {item.profiles?.is_suspended && <mark className="suspended-tag">SUSPENDED</mark>}
                    </div>
                    <div className="info-line">
                        <span className="label-grey">Title:</span> <span className="value-black">"{item.title}"</span>
                    </div>
                    <div className="info-line">
                        <span className="label-grey">Price:</span> <span className="value-orange">R {item.price}</span>
                    </div>
                  </div>
                </div>

                <div className="card-footer-actions">
                  {currentTab === 'active' ? (
                    <>
                      <button className="mod-btn-navy" onClick={() => toggleExpand(item.id, 'flag')}>
                        <Flag size={18} fill="#e63946" stroke="#e63946" /> Flag Listing
                      </button>
                      <button className="mod-btn-red" onClick={() => toggleExpand(item.id, 'delete')}>
                        <Trash2 size={18} /> Delete Item
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="mod-btn-navy" onClick={() => setShowAuditId(showAuditId === item.id ? null : item.id)}>
                        <Info size={18} /> {showAuditId === item.id ? "Hide Details" : "Show Reason"}
                      </button>
                      <button className="mod-btn-restore" onClick={() => openConfirmModal(item, 'restore')}>
                        <CheckCircle size={18} /> Restore
                      </button>
                      <button className="mod-btn-red" onClick={() => toggleExpand(item.id, 'delete')}>
                        Permanent Delete
                      </button>
                    </>
                  )}
                </div>

                {/* SHOW REASONS PANEL (Flagged Tab) */}
                {showAuditId === item.id && (
                    <div className="audit-detail-pane">
                        <div className="audit-row"><strong>Flagged By:</strong> {auditDetails[item.id]?.adminName || "System Moderator"}</div>
                        <div className="audit-row"><strong>Reason Category:</strong> {auditDetails[item.id]?.reason || item.flag_reason}</div>
                        <div className="audit-row"><strong>Admin Notes:</strong> {auditDetails[item.id]?.notes || item.flag_details}</div>
                    </div>
                )}

                {expandedId === item.id && (
                  <div className="expansion-form-area">
                    <div className="expansion-divider"></div>
                    <div className="field-group">
                      <label>Select Reason</label>
                      <select value={reason} onChange={(e) => setReason(e.target.value)}>
                          <option value="">-- Choose Category --</option>
                          <option value="Scam">Scam / Fraud</option>
                          <option value="Unfair Pricing">Unfair Pricing</option>
                          <option value="Prohibited">Prohibited Content</option>
                          <option value="Fake">Fake Photos / Info</option>
                          <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="field-group">
                      <label>Detailed Description</label>
                      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Provide moderation context for the user and logs..." />
                    </div>

                    {currentTab === 'flagged' && studentAppeals[item.seller_id] && (
                        <div className="student-appeal-bubble">
                            <MessageSquare size={16} color="#f0a500" />
                            <div>
                                <strong>Student Appeal Explanation:</strong>
                                <p>{studentAppeals[item.seller_id]}</p>
                            </div>
                        </div>
                    )}

                    <button className="confirm-inline" disabled={!reason || !description} onClick={() => openConfirmModal(item, actionType)}>
                        Confirm {actionType}
                    </button>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </section>

      {/* --- CUSTOM NAVY & ORANGE CONFIRMATION MODAL --- */}
      {confirmModal.show && (
        <div className="custom-modal-overlay">
          <div className="confirmation-card">
            <div className="modal-icon-ring"><AlertTriangle color="#f0a500" size={32} /></div>
            <h3>{confirmModal.title}</h3>
            <p>Are you sure you want to proceed with this action on <strong>{confirmModal.item?.title}</strong>?</p>
            <div className="modal-btn-row">
              <button className="modal-btn-cancel" onClick={() => setConfirmModal({ show: false })}>Cancel</button>
              <button className="modal-btn-confirm" onClick={executeAction}>Confirm Action</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}