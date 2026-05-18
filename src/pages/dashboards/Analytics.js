import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { 
  ArrowLeft, FileText, Table as TableIcon, TrendingUp, ShieldAlert, Calendar, Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// PDF LIBRARIES
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 

import LoadingScreen from '../../components/LoadingScreen';
import './Analytics.css';

const Analytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // --- DATA STATES ---
  const [categoryData, setCategoryData] = useState([]);
  const [tradeUtilization, setTradeUtilization] = useState([]);
  const [statusComparison, setStatusComparison] = useState([]); 
  const [flagReasons, setFlagReasons] = useState([]);
  const [deleteReasons, setDeleteReasons] = useState([]);

  // VIBRANT COLOR PALETTE
  const COLORS = ['#3498db', '#f0a500', '#2ecc71', '#e74c3c', '#9b59b6', '#1abc9c', '#f1c40f', '#0d1b2a'];

  useEffect(() => {
    fetchAllReports();
  }, []);

  const fetchAllReports = async () => {
    setLoading(true);
    try {
      // 1. Popular Categories logic
      const { data: listings } = await supabase.from('listings').select('categories(name)');
      const catMap = {};
      listings?.forEach(item => {
        const name = item.categories?.name || 'Other';
        catMap[name] = (catMap[name] || 0) + 1;
      });
      setCategoryData(Object.keys(catMap).map(key => ({ name: key, value: catMap[key] })));

      // 2. Status Comparison logic
      const { data: statusData } = await supabase.from('listings').select('status');
      const sMap = { active: 0, flagged: 0 };
      statusData?.forEach(item => {
        if(item.status === 'active') sMap.active++;
        if(item.status === 'flagged') sMap.flagged++;
      });
      setStatusComparison([
        { name: 'Active', value: sMap.active, fill: '#2ecc71' },
        { name: 'Flagged', value: sMap.flagged, fill: '#e74c3c' }
      ]);

      // 3. Flagging Reasons logic
      const { data: fLogs } = await supabase.from('moderation_logs').select('reason_category').eq('action_taken', 'flagged');
      const fMap = {};
      fLogs?.forEach(log => { fMap[log.reason_category] = (fMap[log.reason_category] || 0) + 1; });
      setFlagReasons(Object.keys(fMap).map(key => ({ reason: key, count: fMap[key] })));

      // 4. Deleting Reasons logic
      const { data: dLogs } = await supabase.from('moderation_logs').select('reason_category').eq('action_taken', 'deleted');
      const dMap = {};
      dLogs?.forEach(log => { dMap[log.reason_category] = (dMap[log.reason_category] || 0) + 1; });
      setDeleteReasons(Object.keys(dMap).map(key => ({ reason: key, count: dMap[key] })));

      // 5. Facility Usage Logic (As requested: Monday 9 available, 1 reserved)
      setTradeUtilization([
        { day: 'Sun', available: 10, reserved: 0 },
        { day: 'Mon', available: 9, reserved: 1 },
        { day: 'Tue', available: 10, reserved: 0 },
        { day: 'Wed', available: 10, reserved: 0 },
        { day: 'Thu', available: 10, reserved: 0 },
        { day: 'Fri', available: 10, reserved: 0 },
        { day: 'Sat', available: 10, reserved: 0 },
      ]);

    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- EXPORT TOOLS ---

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      alert("No data available to export.");
      return;
    }
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  const exportToPDF = (title, data) => {
    if (!data || data.length === 0) {
        alert("Report data is empty.");
        return;
    }

    try {
        const doc = new jsPDF();
        
        // Add Title
        doc.setFontSize(20);
        doc.setTextColor(13, 27, 42); // Navy Blue
        doc.text("UniMart Admin Report", 14, 20);
        
        doc.setFontSize(14);
        doc.setTextColor(100);
        doc.text(title, 14, 30);

        // Add Timestamp
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 38);

        // Format data for the table
        const headers = [Object.keys(data[0]).map(key => key.toUpperCase())];
        const body = data.map(item => Object.values(item));

        // Use autoTable function directly (This fixes the 'doc.autoTable is not a function' error)
        autoTable(doc, {
            head: headers,
            body: body,
            startY: 45,
            theme: 'grid',
            headStyles: { fillColor: [13, 27, 42], textColor: [240, 165, 0] }, // Navy & Orange
            styles: { fontSize: 10 },
        });

        doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
        console.error("PDF Generation Error:", err);
        alert("Failed to generate PDF. Check console for details.");
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <main className="analytics-page-container">
      <section className="aurora-bg" aria-hidden="true">
        <hr className="orb orb-1" /><hr className="orb orb-2" /><hr className="orb orb-3" />
      </section>

      <header className="main-header">
        <nav className="header-nav">
          <button onClick={() => navigate(-1)} className="back-panel-btn">
            <ArrowLeft size={18} /> Back to Panel
          </button>
          <h1 className="logo-text">Administrative Insights</h1>
        </nav>
      </header>

      <section className="analytics-page-grid">
        
        {/* 1. MARKET HEALTH */}
        <article className="analytics-chart-card">
          <div className="report-header">
            <h3 className="report-title"><ShieldAlert size={20} color="#e74c3c"/> Marketplace Health</h3>
            <button onClick={() => exportToCSV(statusComparison, 'health_status')} className="export-btn"><TableIcon size={14}/></button>
          </div>
          <div style={{width: '100%', height: 250}}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusComparison} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {statusComparison.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* 2. CATEGORIES */}
        <article className="analytics-chart-card">
          <div className="report-header">
            <h3 className="report-title"><TrendingUp size={20} color="#3498db"/> Popular Categories</h3>
            <button onClick={() => exportToCSV(categoryData, 'category_stats')} className="export-btn"><TableIcon size={14}/></button>
          </div>
          <div style={{width: '100%', height: 250}}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80} label dataKey="value">
                  {categoryData.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* 3. FLAGGING REASONS */}
        <article className="analytics-chart-card">
          <div className="report-header">
            <h3 className="report-title"><ShieldAlert size={20} color="#f0a500"/> Flagging Reasons</h3>
            <button onClick={() => exportToPDF('Flagging Reasons Report', flagReasons)} className="export-btn"><FileText size={14}/></button>
          </div>
          <div style={{width: '100%', height: 250}}>
            <ResponsiveContainer>
              <BarChart data={flagReasons} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="reason" type="category" width={100} tick={{fontSize: 10}} />
                <Tooltip cursor={{fill: 'transparent'}}/>
                <Bar dataKey="count" radius={[0, 5, 5, 0]}>
                  {flagReasons.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* 4. DELETION REASONS */}
        <article className="analytics-chart-card">
          <div className="report-header">
            <h3 className="report-title"><Trash2 size={20} color="#e74c3c"/> Deletion History</h3>
            <button onClick={() => exportToPDF('Deletion Audit Report', deleteReasons)} className="export-btn"><FileText size={14}/></button>
          </div>
          <div style={{width: '100%', height: 250}}>
            <ResponsiveContainer>
              <BarChart data={deleteReasons}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="reason" tick={{fontSize: 10}} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                  {deleteReasons.map((entry, index) => <Cell key={index} fill={COLORS[(index + 3) % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* 5. FACILITY USAGE (STACKED BAR - UPDATED) */}
        <article className="analytics-chart-card full-width-report">
          <div className="report-header">
            <h3 className="report-title"><Calendar size={20} color="#1abc9c"/> Trade Facility Utilization (Slot Summary)</h3>
            <div className="export-btn-group">
                <button onClick={() => exportToCSV(tradeUtilization, 'facility_usage')} className="export-btn"><TableIcon size={14}/></button>
                <button onClick={() => exportToPDF('Facility Usage Report', tradeUtilization)} className="export-btn"><FileText size={14}/></button>
            </div>
          </div>
          <div style={{width: '100%', height: 350}}>
            <ResponsiveContainer>
              <BarChart data={tradeUtilization}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" />
                <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="reserved" stackId="a" fill="#f0a500" name="Reserved Slots" />
                <Bar dataKey="available" stackId="a" fill="#0d1b2a" name="Available Capacity" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

      </section>
    </main>
  );
};

export default Analytics;