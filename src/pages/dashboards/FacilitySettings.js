import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { notifyError, notifySuccess } from '../../toast';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Clock, Users, Plus, Trash2, MapPin, 
  User 
} from 'lucide-react';
import LoadingScreen from '../../components/LoadingScreen';
import toast, { Toaster } from 'react-hot-toast'; // Added for notifications
import './FacilitySettings.css';

export default function FacilitySettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // --- NAVIGATION STATE ---
  const [selectedCampus, setSelectedCampus] = useState('Main Campus');
  const [selectedDay, setSelectedDay] = useState('Monday');

  // --- DATA STATE ---
  const [staffPool, setStaffPool] = useState([]); 
  const [timeSlots, setTimeSlots] = useState([]); 

  // --- INPUT STATE ---
  const [newSlot, setNewSlot] = useState({ start: "", end: "", capacity: 5 });

  const campuses = ["Main Campus", "Education Campus", "Med Campus"];
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  useEffect(() => { fetchData(); }, [selectedCampus, selectedDay]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: staff, error: staffErr } = await supabase
        .from('staff_roster')
        .select(`*, profiles:staff_id(full_name, avatar_url)`)
        .eq('day_of_week', selectedDay)
        .eq('campus_name', selectedCampus);
      
      if (staffErr) console.error("Staff Fetch Error:", staffErr);
      setStaffPool(staff || []);

      const { data: slots, error: slotErr } = await supabase
        .from('trade_slots')
        .select('*')
        .eq('campus_name', selectedCampus)
        .order('start_time', { ascending: true });
      
      if (slotErr) console.error("Slot Fetch Error:", slotErr);

      const filteredSlots = slots?.filter(slot => {
          const date = new Date(slot.start_time);
          return weekdays[date.getDay()] === selectedDay;
      });

      setTimeSlots(filteredSlots || []);

    } catch (err) { console.error("General Error:", err); }
    finally { setLoading(false); }
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
    
    // 1. Verify Staff Availability Guardrail
    const isStaffAvailable = staffPool.some(s => 
        newSlot.start >= s.shift_start && newSlot.end <= s.shift_end
    );

    if (!isStaffAvailable) {
        toast.error(`No staff on duty for the window ${newSlot.start}-${newSlot.end}`, {
            duration: 4000,
            style: { border: '1px solid #e63946', padding: '16px', color: '#e63946' }
        });
        return;
    }

    const toastId = toast.loading("Creating slot...");

    try {
        // 2. Calculate the next occurrence of the selected weekday, then create slots
        //    for the next 4 weekly recurrences so bookings always have future availability.
        const today = new Date();
        const targetDayIndex = weekdays.indexOf(selectedDay);
        const currentDayIndex = today.getDay();
        const daysUntilTarget = (targetDayIndex - currentDayIndex + 7) % 7;

        const [startHour, startMin] = newSlot.start.split(':').map(Number);
        const [endHour, endMin] = newSlot.end.split(':').map(Number);

        const slotsToInsert = [];
        for (let week = 0; week < 4; week++) {
            const slotDate = new Date(today);
            slotDate.setDate(today.getDate() + daysUntilTarget + week * 7);

            const startDate = new Date(slotDate);
            startDate.setHours(startHour, startMin, 0, 0);

            const endDate = new Date(slotDate);
            endDate.setHours(endHour, endMin, 0, 0);

            slotsToInsert.push({
                campus_name: selectedCampus,
                start_time: startDate.toISOString(),
                end_time: endDate.toISOString(),
                max_capacity: parseInt(newSlot.capacity),
                current_bookings: 0,
                is_active: true
            });
        }

        const { error } = await supabase.from('trade_slots').insert(slotsToInsert);

        if (error) {
            toast.error("Database Error: " + error.message, { id: toastId });
        } else {
            toast.success("Trading slot added successfully!", { id: toastId });
            setNewSlot({ start: "", end: "", capacity: 5 });
            fetchData();
            notifySuccess("Slot added successfully!");
        }
    } catch (err) {
        toast.error("System Error: " + err.message, { id: toastId });
    }
  };

  const handleDeleteSlot = async (id) => {
    if (window.confirm("Are you sure you want to remove this time window?")) {
        const toastId = toast.loading("Removing slot...");
        const { error } = await supabase.from('trade_slots').delete().eq('id', id);
        
        if (error) {
            toast.error("Could not delete: " + error.message, { id: toastId });
        } else {
            toast.success("Slot removed.", { id: toastId });
            fetchData();
        }
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <main className="dashboard-container facility-theme">
      {/* Toast provider */}
      <Toaster position="top-right" reverseOrder={false} />

      <section className="aurora-bg" aria-hidden="true"><hr className="orb orb-1" /><hr className="orb orb-2" /><hr className="orb orb-3" /></section>

      <header className="main-header glass-header">
        <nav className="header-nav">
          <button className="back-btn-gold" onClick={() => navigate(-1)}><ArrowLeft size={20} /> Back</button>
          <h1 className="logo-text gold-text">Facility Manager</h1>
          <div className="tab-switcher">
            {campuses.map(c => (
              <button key={c} className={`tab-btn ${selectedCampus === c ? 'active-solid' : 'inactive-faded'}`} onClick={() => setSelectedCampus(c)}>
                <MapPin size={14} /> {c.split(' ')[0]}
              </button>
            ))}
          </div>
        </nav>
        <nav className="day-switcher-bar">
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                <button key={day} className={`day-selector-btn ${selectedDay === day ? 'day-selected' : 'day-unselected'}`} onClick={() => setSelectedDay(day)}>{day}</button>
            ))}
        </nav>
      </header>

      <section className="facility-two-pane-grid">
        <div className="pane-card">
          <header className="pane-header-navy">
            <Clock size={18} color="#f0a500" />
            <h3>1. Slot Allocation ({selectedDay})</h3>
          </header>
          <div className="pane-inner">
            <form className="add-slot-form" onSubmit={handleAddSlot}>
                <div className="input-group-row">
                    <div className="field"><label>Start</label><input type="time" value={newSlot.start} onChange={e => setNewSlot({...newSlot, start: e.target.value})} required/></div>
                    <div className="field"><label>End</label><input type="time" value={newSlot.end} onChange={e => setNewSlot({...newSlot, end: e.target.value})} required/></div>
                    <div className="field"><label>Slots</label><input type="number" value={newSlot.capacity} onChange={e => setNewSlot({...newSlot, capacity: e.target.value})} required/></div>
                </div>
                <button type="submit" className="btn-add-window"><Plus size={16} /> Add Slot</button>
            </form>
            <div className="pane-scroll">
                {timeSlots.length === 0 ? <p className="empty-txt">No windows configured for this day.</p> : timeSlots.map(slot => (
                    <div key={slot.id} className="slot-allocation-row">
                        <div style={{display:'flex', flexDirection:'column'}}>
                            <strong style={{color: '#0d1b2a'}}>
                                {new Date(slot.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                                {new Date(slot.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </strong>
                            <span style={{fontSize: '11px', color: '#666'}}>Available: {slot.max_capacity - (slot.current_bookings || 0)} / {slot.max_capacity}</span>
                        </div>
                        <button onClick={() => handleDeleteSlot(slot.id)} style={{background:'none', border:'none', cursor:'pointer'}} title="Delete Slot">
                            <Trash2 size={16} color="#e63946" />
                        </button>
                    </div>
                ))}
            </div>
          </div>
        </div>

        <div className="pane-card">
          <header className="pane-header-navy" style={{background: '#f0a500'}}>
            <Users size={18} color="#0d1b2a" />
            <h3 style={{color: '#0d1b2a'}}>2. Employees on Duty</h3>
          </header>
          <div className="pane-inner">
            <div className="pane-scroll">
                {staffPool.length === 0 ? <p className="empty-txt">No staff rostered for this day.</p> : staffPool.map((s, idx) => (
                    <div key={idx} className="worker-row">
                        <div className="worker-avatar-wrap">
                            {s.profiles?.avatar_url ? <img src={s.profiles.avatar_url} alt="Avatar" style={{width:'100%', borderRadius: '50%'}} /> : <User size={20} color="#0d1b2a" />}
                        </div>
                        <div className="worker-info">
                            <strong>{s.profiles?.full_name}</strong>
                            <span className="shift-badge">Shift: {s.shift_start} - {s.shift_end}</span>
                        </div>
                        <div className="status-indicator"></div>
                    </div>
                ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}