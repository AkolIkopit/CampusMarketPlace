import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Clock, Users, Plus, Trash2, MapPin, 
  Calendar, Check, AlertCircle, User 
} from 'lucide-react';
import LoadingScreen from '../../components/LoadingScreen';
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

  // --- CONFIG STATE ---
  const [settings, setSettings] = useState({
    open_time: '08:00',
    close_time: '17:00',
    slot_duration_minutes: 30,
    max_capacity_per_slot: 5
  });

  const campuses = ["Main Campus", "Education Campus", "Med Campus"];
  const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  useEffect(() => {
    fetchFacilityData();
  }, [selectedCampus, selectedDay]);

  const fetchFacilityData = async () => {
    setLoading(true);
    try {
      // 1. Get Operating Rules for the current campus
      const { data: s } = await supabase.from('facility_settings').select('*').eq('campus_name', selectedCampus).maybeSingle();
      if (s) setSettings(s);

      // 2. Fetch Staff for this day and campus (The Workers)
      const { data: staffData } = await supabase
        .from('staff_roster')
        .select(`profiles!inner(id, full_name, avatar_url)`)
        .eq('day_of_week', selectedDay)
        .eq('campus_name', selectedCampus);

      setStaffPool(staffData || []);

      // 3. Fetch Time Slots for this day and campus
      const { data: slots, error: slotError } = await supabase
        .from('trade_slots')
        .select('*')
        .eq('campus_name', selectedCampus)
        .order('start_time', { ascending: true });

      // Filter slots that belong to the chosen day of the week
      const daySlots = slots?.filter(slot => {
          const date = new Date(slot.start_time);
          return date.toLocaleDateString('en-US', { weekday: 'long' }) === selectedDay;
      });

      setTimeSlots(daySlots || []);

    } catch (err) {
      console.error("Database Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    const { error } = await supabase
      .from('facility_settings')
      .update({
        open_time: settings.open_time,
        close_time: settings.close_time,
        slot_duration_minutes: settings.slot_duration_minutes,
        max_capacity_per_slot: settings.max_capacity_per_slot
      })
      .eq('campus_name', selectedCampus);

    if (!error) {
        alert("Parameters saved!");
        fetchFacilityData();
    }
  };

  const generateSlots = async () => {
    const confirm = window.confirm(`Generate slots for the next ${selectedDay}?`);
    if (!confirm) return;

    const today = new Date();
    const dayIndex = weekdays.indexOf(selectedDay);
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + (dayIndex + 7 - today.getDay()) % 7);

    const newSlots = [];
    let current = new Date(targetDate.setHours(settings.open_time.split(':')[0], settings.open_time.split(':')[1], 0));
    const end = new Date(targetDate.setHours(settings.close_time.split(':')[0], settings.close_time.split(':')[1], 0));

    while (current < end) {
      const slotEnd = new Date(current.getTime() + settings.slot_duration_minutes * 60000);
      newSlots.push({
        campus_name: selectedCampus,
        start_time: current.toISOString(),
        end_time: slotEnd.toISOString(),
        max_capacity: settings.max_capacity_per_slot,
        current_bookings: 0
      });
      current = slotEnd;
    }

    const { error } = await supabase.from('trade_slots').insert(newSlots);
    if (error) alert(error.message);
    else fetchFacilityData();
  };

  const handleDeleteSlot = async (id) => {
    if (!window.confirm("Delete this time slot?")) return;
    const { error } = await supabase.from('trade_slots').delete().eq('id', id);
    if (!error) fetchFacilityData();
  };

  if (loading) return <LoadingScreen />;

  return (
    <main className="dashboard-container facility-theme">
      <section className="aurora-bg" aria-hidden="true"><hr className="orb orb-1" /><hr className="orb orb-2" /><hr className="orb orb-3" /></section>

      <header className="main-header glass-header">
        <nav className="header-nav">
          <button className="back-btn-gold" onClick={() => navigate(-1)}><ArrowLeft size={20} /> Back</button>
          <div className="tab-switcher">
            {campuses.map(c => (
              <button key={c} className={`tab-btn ${selectedCampus === c ? 'active-solid' : 'inactive-faded'}`} onClick={() => setSelectedCampus(c)}>
                <MapPin size={14} /> {c.split(' ')[0]}
              </button>
            ))}
          </div>
        </nav>

        {/* DAY SELECTOR BAR - NAVY & ORANGE */}
        <nav className="day-switcher-bar">
            {weekdays.map(day => (
                <button 
                  key={day} 
                  className={`day-selector-btn ${selectedDay === day ? 'day-selected' : 'day-unselected'}`} 
                  onClick={() => setSelectedDay(day)}
                >
                    {day}
                </button>
            ))}
        </nav>
      </header>

      <section className="facility-two-pane-grid" style={{display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '30px', padding: '40px', maxWidth: '1400px', margin: '0 auto'}}>
        
        {/* PANE 1: SLOT ALLOCATION (WITH NUMBERS) */}
        <div className="pane-card" style={{background: 'white', borderRadius: '25px', border: '2px solid #0d1b2a', overflow: 'hidden', height: '680px', display: 'flex', flexDirection: 'column'}}>
          <header style={{background: '#0d1b2a', padding: '20px', color: '#f0a500'}}>
             <h3 style={{margin:0, textTransform: 'uppercase', fontSize: '14px'}}>Config & Time Slots</h3>
          </header>
          
          <div style={{padding: '20px', flex: 1, overflowY: 'auto'}}>
            {/* Rules Form */}
            <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '15px', marginBottom: '20px', border: '1px solid #ddd'}}>
                <div style={{display: 'flex', gap: '10px', marginBottom: '10px'}}>
                    <div style={{flex: 1}}>
                        <label style={{fontSize: '10px', fontWeight: 'bold', color: '#0d1b2a'}}>Open</label>
                        <input type="time" value={settings.open_time} onChange={e => setSettings({...settings, open_time: e.target.value})} style={{width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ccc'}}/>
                    </div>
                    <div style={{flex: 1}}>
                        <label style={{fontSize: '10px', fontWeight: 'bold', color: '#0d1b2a'}}>Close</label>
                        <input type="time" value={settings.close_time} onChange={e => setSettings({...settings, close_time: e.target.value})} style={{width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ccc'}}/>
                    </div>
                    <div style={{flex: 1}}>
                        <label style={{fontSize: '10px', fontWeight: 'bold', color: '#0d1b2a'}}>Cap/Slot</label>
                        <input type="number" value={settings.max_capacity_per_slot} onChange={e => setSettings({...settings, max_capacity_per_slot: parseInt(e.target.value)})} style={{width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ccc'}}/>
                    </div>
                </div>
                <button onClick={handleSaveSettings} style={{width: '100%', padding: '12px', background: '#0d1b2a', color: '#f0a500', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer'}}>Save Rules</button>
            </div>

            <button onClick={generateSlots} style={{width: '100%', background: '#f0a500', color: '#0d1b2a', padding: '15px', borderRadius: '15px', border: 'none', fontWeight: '900', marginBottom: '20px', cursor: 'pointer'}}>
                GENERATE {selectedDay.toUpperCase()} CALENDAR
            </button>

            {/* THE SLOTS LIST WITH COUNTERS */}
            {timeSlots.map(slot => (
                <div key={slot.id} style={{padding: '15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                        <strong style={{color: '#0d1b2a', fontSize: '15px'}}>
                            {new Date(slot.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {new Date(slot.end_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                        </strong>
                        <div style={{display: 'flex', gap: '10px'}}>
                            <span style={{fontSize: '10px', background: '#0d1b2a', color: '#fff', padding: '2px 8px', borderRadius: '4px'}}>Total Cap: {slot.max_capacity}</span>
                            <span style={{fontSize: '10px', background: '#f0a500', color: '#0d1b2a', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold'}}>Booked: {slot.current_bookings || 0}</span>
                            <span style={{fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold'}}>Available: {slot.max_capacity - (slot.current_bookings || 0)}</span>
                        </div>
                    </div>
                    <button onClick={() => handleDeleteSlot(slot.id)} style={{background: 'none', border: 'none', cursor: 'pointer'}}><Trash2 size={18} color="#e63946" /></button>
                </div>
            ))}
          </div>
        </div>

        {/* PANE 2: AVAILABLE WORKERS */}
        <div className="pane-card" style={{background: 'white', borderRadius: '25px', border: '2px solid #0d1b2a', overflow: 'hidden', height: '680px', display: 'flex', flexDirection: 'column'}}>
          <header style={{background: '#f0a500', padding: '20px', color: '#0d1b2a'}}>
            <h3 style={{margin:0, textTransform: 'uppercase', fontSize: '14px'}}>Staff on Duty ({selectedDay})</h3>
          </header>
          
          <div style={{padding: '20px', flex: 1, overflowY: 'auto'}}>
            {staffPool.length === 0 ? (
                <div style={{textAlign: 'center', marginTop: '50px'}}>
                    <AlertCircle size={40} color="#ccc" style={{marginBottom: '10px'}}/>
                    <p style={{color: '#999', fontSize: '14px'}}>No staff rostered for this day.</p>
                </div>
            ) : (
                staffPool.map((s, idx) => (
                    <div key={idx} style={{padding: '15px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '15px'}}>
                        <div style={{width: '45px', height: '45px', background: '#f0f4f8', borderRadius: '50%', overflow: 'hidden', border: '2px solid #0d1b2a', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                            {s.profiles?.avatar_url ? <img src={s.profiles.avatar_url} alt="" style={{width:'100%'}} /> : <User size={20} color="#0d1b2a" />}
                        </div>
                        <div>
                            <strong style={{display: 'block', color: '#0d1b2a', fontSize: '14px'}}>{s.profiles?.full_name || "Unknown Staff"}</strong>
                            <span style={{fontSize: '10px', fontWeight: 'bold', color: '#27ae60'}}>FULL DAY SHIFT</span>
                        </div>
                    </div>
                ))
            )}
          </div>
        </div>

      </section>
    </main>
  );
}