import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { notifyError, notifySuccess } from '../../toast';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Trash2, ShieldAlert, CheckCircle, 
  Search, User, MessageSquare, X, AlertTriangle 
} from 'lucide-react';
import LoadingScreen from '../../components/LoadingScreen';
import toast, { Toaster } from 'react-hot-toast'; 
import './UserManagement.css';

export default function UserManagement() {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState('active'); 
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [activeTotal, setActiveTotal] = useState(0);
  const [suspendedTotal, setSuspendedTotal] = useState(0);

  // Expansion and Form state
  const [expandedId, setExpandedId] = useState(null);
  const [actionType, setActionType] = useState(null); 
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");

  // --- CUSTOM CONFIRMATION OVERLAY STATE ---
  const [showConfirm, setShowConfirm] = useState(false);
  const [targetUser, setTargetUser] = useState(null);

  useEffect(() => {
    fetchData();
    updateCounts();
  }, [currentTab]);

  const fetchData = async () => {
    setLoading(true);
    setExpandedId(null);
    const isSuspendedQuery = currentTab === 'suspended';
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_suspended', isSuspendedQuery)
      .order('full_name', { ascending: true });

    if (error) {
      toast.error("Failed to fetch users");
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const updateCounts = async () => {
    const { count: a } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_suspended', false);
    const { count: s } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_suspended', true);
    setActiveTotal(a || 0);
    setSuspendedTotal(s || 0);
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

  // 1. Step one: Trigger the custom popup
  const triggerConfirmation = (user) => {
    if (!reason || !description) {
      toast.error("Please provide reason and details first.");
      return;
    }
    setTargetUser(user);
    setShowConfirm(true);
  };

  // 2. Step two: Execute the actual DB logic
  const handleFinalAction = async () => {
    setShowConfirm(false);
    setIsProcessing(true);
    const toastId = toast.loading(`Executing ${actionType}...`);
    
    try {
        const { data: { user: admin } } = await supabase.auth.getUser();

        // Log action
        const { error: logError } = await supabase.from('moderation_logs').insert([{
            admin_id: admin.id,
            target_id: targetUser.id,
            target_type: 'user',
            target_name: targetUser.full_name,
            action_taken: actionType === 'suspend' ? 'suspended' : 'deleted',
            reason_category: reason,
            extra_description: description
        }]);

        if (logError) throw new Error("Log Error: " + logError.message);

        if (actionType === 'suspend') {
            const { error: updError } = await supabase.from('profiles').update({ 
                is_suspended: true, 
                suspension_reason: reason, 
                suspension_details: description 
            }).eq('id', targetUser.id);
            if (updError) throw updError;
            toast.success("User suspended.", { id: toastId });
        } else {
            const { error: delError } = await supabase.from('profiles').delete().eq('id', targetUser.id);
            if (delError) {
              if (delError.code === '23503') throw new Error("User has active listings. Delete those first.");
              throw delError;
            }
            toast.success("User permanently deleted.", { id: toastId });
        }

        fetchData();
        updateCounts();
    } catch (err) {
        toast.error(err.message, { id: toastId });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleReactivate = async (user) => {
    setTargetUser(user);
    setActionType('reactivate');
    setShowConfirm(true);
  };

  const handleFinalReactivate = async () => {
    setShowConfirm(false);
    const toastId = toast.loading("Restoring user...");
    const { error } = await supabase.from('profiles').update({ 
        is_suspended: false, 
        suspension_reason: null, 
        suspension_details: null 
    }).eq('id', targetUser.id);

    if (error) {
        toast.error("Error: " + error.message, { id: toastId });
    } else {
        toast.success("User reinstated.", { id: toastId });
        fetchData();
        updateCounts();
    }
  };

  if (loading) return <LoadingScreen />;

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="dashboard-container mod-white-theme">
      <Toaster position="top-center" />
      
      {/* --- BETTER CONFIRMATION POPUP (MODAL) --- */}
      {showConfirm && (
        <div className="custom-overlay">
          <div className="confirm-modal-card">
            <AlertTriangle size={48} color="#f0a500" style={{ marginBottom: '15px' }} />
            <h2>Confirm {actionType === 'reactivate' ? 'Reactivation' : actionType.toUpperCase()}</h2>
            <p>Are you sure you want to {actionType} <strong>{targetUser?.full_name}</strong>?</p>
            {actionType === 'delete' && <p className="warning-text">This action is permanent and cannot be undone.</p>}
            
            <div className="modal-btn-row">
              <button className="modal-btn-cancel" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button 
                className={`modal-btn-confirm ${actionType === 'delete' ? 'bg-red' : 'bg-navy'}`}
                onClick={actionType === 'reactivate' ? handleFinalReactivate : handleFinalAction}
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="aurora-bg" aria-hidden="true">
        <hr className="orb orb-1" /><hr className="orb orb-2" /><hr className="orb orb-3" />
      </section>

      <header className="main-header glass-header">
        <nav className="header-nav">
          <button className="back-btn-gold" onClick={() => navigate(-1)}><ArrowLeft size={20} /> Back</button>
          
          <div className="tab-switcher">
            <button className={`tab-btn ${currentTab === 'active' ? 'active-solid' : 'inactive-faded'}`} onClick={() => setCurrentTab('active')}>
                Active <span className="tab-count">{activeTotal}</span>
            </button>
            <button className={`tab-btn ${currentTab === 'suspended' ? 'active-solid' : 'inactive-faded'}`} onClick={() => setCurrentTab('suspended')}>
                Suspended <span className="tab-count">{suspendedTotal}</span>
            </button>
          </div>

          <div className="admin-search-giant">
             <Search size={22} color="#f0a500" />
             <input type="text" placeholder="Search students..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </nav>
      </header>

      <section className="centered-mod-layout">
        <div className="mod-feed-column">
          {filteredUsers.length === 0 ? <div className="empty-state-big">NO USERS FOUND</div> : (
            filteredUsers.map(user => (
              <article key={user.id} className={`mod-card-white ${expandedId === user.id ? 'active-expansion' : ''}`}>
                <div className="card-main-content">
                  <div className="corner-user-badge">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} className="user-corner-img" alt="" />
                      ) : (
                        <div className="user-corner-icon"><User size={24} color="#0d1b2a" /></div>
                      )}
                  </div>
                  <div className="item-details">
                    <div className="info-line"><span className="label-navy">Username:</span> <span className="value-navy">{user.full_name}</span></div>
                    <div className="info-line"><span className="label-grey">Role:</span> <span className="value-black">{user.role?.toUpperCase()}</span></div>
                    <div className="info-line"><span className="label-grey">Campus:</span> <span className="value-black">{user.campus || "Not Set"}</span></div>
                  </div>
                </div>

                <div className="card-footer-actions">
                  {currentTab === 'active' ? (
                    <>
                      <button className="mod-btn-navy" onClick={() => toggleExpand(user.id, 'suspend')} disabled={isProcessing}>
                        <ShieldAlert size={18} /> Suspend
                      </button>
                      <button className="mod-btn-red" onClick={() => toggleExpand(user.id, 'delete')} disabled={isProcessing}>
                        <Trash2 size={18} /> Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="mod-btn-navy" style={{color: '#27ae60'}} onClick={() => handleReactivate(user)} disabled={isProcessing}>
                        <CheckCircle size={18} /> Reactivate
                      </button>
                      <button className="mod-btn-red" onClick={() => toggleExpand(user.id, 'delete')} disabled={isProcessing}>
                        Permanent Delete
                      </button>
                    </>
                  )}
                </div>

                {expandedId === user.id && (
                  <div className="expansion-form-area">
                    <div className="expansion-divider"></div>
                    <div className="field-group">
                      <label>Reason for {actionType?.toUpperCase()}</label>
                      <select value={reason} onChange={(e) => setReason(e.target.value)}>
                          <option value="">-- Select Category --</option>
                          <option value="Fraud">Fraudulent Activity</option>
                          <option value="Harassment">Harassment / Behavior</option>
                          <option value="Policy">Policy Violation</option>
                          <option value="Spam">Spamming / Multiple Posts</option>
                          <option value="Other">Other Reason</option>
                      </select>
                    </div>
                    <div className="field-group">
                      <label>Additional Details</label>
                      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Provide context for admin logs..." />
                    </div>
                    <button className="confirm-inline" disabled={!reason || !description || isProcessing} onClick={() => triggerConfirmation(user)}>
                      {isProcessing ? "Processing..." : `Confirm ${actionType}`}
                    </button>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}