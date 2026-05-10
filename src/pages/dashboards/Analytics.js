import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { 
  ArrowLeft, FileText, Table as TableIcon, TrendingUp, ShieldAlert, Calendar 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import './Analytics.css'; // IMPORTING THE NEW UNIQUE CSS

const Analytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [categoryData, setCategoryData] = useState([]);
  const [tradeUtilization, setTradeUtilization] = useState([]);
  const [moderationSummary, setModerationSummary] = useState([]);

  const COLORS = ['#0d1b2a', '#f0a500', '#1b263b', '#e67e22', '#3e5c76'];

  useEffect(() => {
    fetchAllReports();
  }, []);

  const fetchAllReports = async () => {
    setLoading(true);
    try {
      // 1. Popular Categories
      const { data: listings } = await supabase.from('listings').select('category_id, categories(name)');
      const catMap = {};
      listings?.forEach(item => {
        const name = item.categories?.name || 'Uncategorized';
        catMap[name] = (catMap[name] || 0) + 1;
      });
      setCategoryData(Object.keys(catMap).map(key => ({ name: key, value: catMap[key] })));

      // 2. Trade Facility Utilization (Mock)
      setTradeUtilization([
        { day: 'Mon', booked: 12, capacity: 20 },
        { day: 'Tue', booked: 18, capacity: 20 },
        { day: 'Wed', booked: 15, capacity: 20 },
        { day: 'Thu', booked: 20, capacity: 20 },
        { day: 'Fri', booked: 9, capacity: 20 },
      ]);

      // 3. Moderation Summary
      const { data: flags } = await supabase.from('role_applications').select('status');
      const modMap = { approved: 0, pending: 0, rejected: 0 };
      flags?.forEach(f => modMap[f.status]++);
      setModerationSummary([
        { name: 'Approved', value: modMap.approved },
        { name: 'Pending', value: modMap.pending },
        { name: 'Rejected', value: modMap.rejected },
      ]);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const exportToCSV = (data, filename) => {
    if (!data.length) return;
    const csvRows = [Object.keys(data[0]).join(','), ...data.map(row => Object.values(row).join(','))];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
  };

  const exportToPDF = (title, data) => {
    if (!data.length) return;
    const doc = new jsPDF();
    doc.text(title, 20, 10);
    doc.autoTable({ head: [Object.keys(data[0])], body: data.map(item => Object.values(item)), startY: 20 });
    doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
  };

  return (
    <main className="analytics-page-container">
      {/* AURORA BG */}
      <section className="aurora-bg" aria-hidden="true">
        <hr className="orb orb-1" /><hr className="orb orb-2" /><hr className="orb orb-3" />
      </section>

      <header className="main-header">
        <nav className="header-nav">
          <button onClick={() => navigate(-1)} style={{background: 'none', border: 'none', color: '#0d1b2a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '16px', fontWeight: 'bold'}}>
            <ArrowLeft size={18} /> Back to Panel
          </button>
          <h1 className="logo-text">Platform Analytics</h1>
        </nav>
      </header>

      <section className="hero-section" style={{paddingBottom: '0'}}>
        <h1 className="hero-title">Report Hub</h1>
        <p className="hero-description">Real-time insights and exportable data summaries.</p>
      </section>

      {/* USING THE NEW UNIQUE NAMES FROM Analytics.css */}
      <section className="analytics-page-grid">
        
        {/* CHART 1: CATEGORIES */}
        <article className="analytics-chart-card">
          <div className="report-header">
            <h3 className="report-title"><TrendingUp size={20} color="#f0a500"/> Popular Categories</h3>
            <div className="export-btn-group">
               <button onClick={() => exportToCSV(categoryData, 'categories')} className="export-btn" title="CSV"><TableIcon size={16}/></button>
               <button onClick={() => exportToPDF('Category Report', categoryData)} className="export-btn" title="PDF"><FileText size={16}/></button>
            </div>
          </div>
          <div style={{width: '100%', height: 250}}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={categoryData} innerRadius={60} outerRadius={80} dataKey="value">
                  {categoryData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* CHART 2: FACILITY USAGE */}
        <article className="analytics-chart-card">
          <div className="report-header">
            <h3 className="report-title"><Calendar size={20} color="#f0a500"/> Facility Usage</h3>
            <div className="export-btn-group">
               <button onClick={() => exportToCSV(tradeUtilization, 'facility_usage')} className="export-btn"><TableIcon size={16}/></button>
               <button onClick={() => exportToPDF('Trade Facility Usage', tradeUtilization)} className="export-btn"><FileText size={16}/></button>
            </div>
          </div>
          <div style={{width: '100%', height: 250}}>
            <ResponsiveContainer>
              <BarChart data={tradeUtilization}>
                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="booked" fill="#f0a500" radius={[4, 4, 0, 0]} />
                <Bar dataKey="capacity" fill="#0d1b2a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* CHART 3: MODERATION */}
        <article className="analytics-chart-card full-width-report">
          <div className="report-header">
            <h3 className="report-title"><ShieldAlert size={20} color="#f0a500"/> Moderation Activity</h3>
            <div className="export-btn-group">
               <button onClick={() => exportToCSV(moderationSummary, 'moderation_stats')} className="export-btn"><TableIcon size={16}/></button>
               <button onClick={() => exportToPDF('Moderation Report', moderationSummary)} className="export-btn"><FileText size={16}/></button>
            </div>
          </div>
          <div style={{width: '100%', height: 300}}>
            <ResponsiveContainer>
              <AreaChart data={moderationSummary}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f0a500" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f0a500" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#f0a500" fillOpacity={1} fill="url(#colorVal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

      </section>
    </main>
  );
};

export default Analytics;