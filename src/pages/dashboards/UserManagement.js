import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Trash2, ShieldAlert, CheckCircle, 
  Search, User, MessageSquare, X 
} from 'lucide-react';
import LoadingScreen from '../../components/LoadingScreen';
import './UserManagement.css';

export default function UserManagement() {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState('active'); 
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [activeTotal, setActiveTotal] = useState(0);
  const [suspendedTotal, setSuspendedTotal] = useState(0);

  const [expandedId, setExpandedId] = useState(null);
  const [actionType, setActionType] = useState(null); 
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");

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

    if (error) console.error(error);
    else setUsers(data || []);
    setLoading(false);
  };

  const updateCounts = async () => {
    const { count: a } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_suspended', false);
    const { count: s } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_suspended', true);
    setActiveTotal(a || 0);
    setSuspendedTotal(s || 0);
  };

  const toggleExpand = (id, type) => {
    if (expandedId === id && actionType === type) setExpandedId(null);
    else { setExpandedId(id); setActionType(type); }
    setReason(""); setDescription("");
  };

  const handleConfirmAction = async (targetUser) => {
    if (!reason || !description) {
        alert("Please select a reason and provide a description.");
        return;
    }
    const { data: { user: admin } } = await supabase.auth.getUser();

    try {
        // 1. Attempt to Log the action
        const { error: logError } = await supabase.from('moderation_logs').insert([{
            admin_id: admin.id,
            target_id: targetUser.id,
            target_type: 'user',
            target_name: targetUser.full_name,
            action_taken: actionType === 'suspend' ? 'suspended' : 'deleted',
            reason_category: reason,
            extra_description: description
        }]);

        if (logError) throw new Error("Log Table Error: " + logError.message);

        // 2. Perform DB Update or Delete
        if (actionType === 'suspend') {
            const { error: updError } = await supabase.from('profiles').update({ 
                is_suspended: true, 
                suspension_reason: reason, 
                suspension_details: description 
            }).eq('id', targetUser.id);
            if (updError) throw new Error("Update Profile Error: " + updError.message);
        } else {
            const { error: delError } = await supabase.from('profiles').delete().eq('id', targetUser.id);
            if (delError) throw new Error("Delete Profile Error: " + delError.message + " (Check if user has listings first!)");
        }

        alert("Action successfully processed!");
        fetchData();
        updateCounts();
    } catch (err) {
        alert(err.message); // This will show you exactly what Supabase is unhappy about
    }
  };

  const handleReactivate = async (id) => {
    const { error } = await supabase.from('profiles').update({ 
        is_suspended: false, 
        suspension_reason: null, 
        suspension_details: null 
    }).eq('id', id);

    if (error) alert("Reactivate Error: " + error.message);
    else {
        alert("User account reinstated.");
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
          {filteredUsers.length === 0 ? <div className="empty-state-big">EMPTY</div> : (
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
                      <button className="mod-btn-navy" onClick={() => toggleExpand(user.id, 'suspend')}>
                        <ShieldAlert size={18} /> Suspend
                      </button>
                      <button className="mod-btn-red" onClick={() => toggleExpand(user.id, 'delete')}>
                        <Trash2 size={18} /> Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="mod-btn-navy" style={{color: '#27ae60'}} onClick={() => handleReactivate(user.id)}>
                        <CheckCircle size={18} /> Reactivate
                      </button>
                      <button className="mod-btn-red" onClick={() => toggleExpand(user.id, 'delete')}>
                        Permanent Delete
                      </button>
                    </>
                  )}
                </div>

                {expandedId === user.id && (
                  <div className="expansion-form-area">
                    <div className="expansion-divider"></div>
                    <div className="field-group">
                      <label>Reason for {actionType}</label>
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
                      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Provide audit log context..." />
                    </div>
                    <button className="confirm-inline" disabled={!reason || !description} onClick={() => handleConfirmAction(user)}>Confirm {actionType}</button>
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