import React, { useEffect, useState, useMemo } from 'react';
import { getApplications } from '../services/api';
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  PieChart, 
  Pie,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown,
  Users, 
  FileText, 
  CheckCircle, 
  Clock,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  MapPin,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Award,
  Zap,
  Target,
  RefreshCw,
  Download
} from 'lucide-react';
import './Analytics.css';

const Analytics = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setRefreshing(true);
    console.log('🔄 Fetching fresh data from database...');
    
    try {
      const appsData = await getApplications({});
      console.log(`✅ Fetched ${appsData.length} applications from DB`);
      
      setApplications(appsData);
      setLastUpdate(new Date());
      
      const statusCounts = {
        PENDING: appsData.filter(a => a.status === 'PENDING').length,
        HEARD: appsData.filter(a => a.status === 'HEARD').length,
        REFERRED: appsData.filter(a => a.status === 'REFERRED').length,
        CLOSED: appsData.filter(a => a.status === 'CLOSED').length
      };
      console.log('📊 Current Status Distribution:', statusCounts);
      
    } catch (error) {
      console.error('❌ Error fetching analytics:', error);
      alert('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const metrics = useMemo(() => {
    if (!applications || applications.length === 0) {
      return {
        statusDist: { PENDING: 0, HEARD: 0, REFERRED: 0, CLOSED: 0 },
        feedbackDist: { POSITIVE:  0, NEGATIVE: 0, PENDING: 0 },
        monthlyTrend: [],
        dailyTrend:  [],
        topPS: [],
        topCategories: [],
        divisionPerformance: [],
        resolutionTime: [],
        topSHOs: [],
        statusByPS: [],
        categoryFeedback: [],
        performanceMetrics: []
      };
    }

    console.log('🔢 Calculating metrics from', applications.length, 'applications');

    // 1. STATUS DISTRIBUTION
    const statusDist = {
      PENDING: applications.filter(a => a.status === 'PENDING').length,
      HEARD: applications.filter(a => a.status === 'HEARD').length,
      REFERRED: applications.filter(a => a.status === 'REFERRED').length,
      CLOSED: applications.filter(a => a.status === 'CLOSED').length
    };
    console.log('✅ Status Distribution:', statusDist);

    // 2. FEEDBACK DISTRIBUTION
    const feedbackDist = {
      POSITIVE: applications.filter(a => a.feedback === 'POSITIVE').length,
      NEGATIVE: applications.filter(a => a.feedback === 'NEGATIVE').length,
      PENDING: applications.filter(a => a.feedback === 'PENDING').length
    };
    console.log('✅ Feedback Distribution:', feedbackDist);

    // 3. MONTHLY TREND - USING ACTUAL APPLICATION DATE (NOT created_at)
    const monthlyData = {};
    const monthYearMap = {};
    
    applications.forEach(app => {
      if (app.date) {  // ⚡ CHANGED FROM app.created_at to app.date
        try {
          const date = new Date(app.date);
          if (!isNaN(date.getTime())) {
            const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
            monthYearMap[monthKey] = sortKey;
          }
        } catch (e) {
          console.error('Invalid date:', app.date);
        }
      }
    });

    const monthlyTrend = Object. entries(monthlyData)
      .map(([month, applications]) => ({
        month,
        applications,
        sortKey: monthYearMap[month]
      }))
      .sort((a, b) => a.sortKey. localeCompare(b.sortKey))
      .slice(-6)
      .map(({ month, applications }) => ({ month, applications }));

    console.log('📅 Monthly Trend:', monthlyTrend);

    // 4. DAILY TREND - USING ACTUAL APPLICATION DATE (NOT created_at)
    const dailyData = {};
    const dailySortMap = {};
    const today = new Date();
    const last30Days = new Date(today);
    last30Days.setDate(today.getDate() - 30);

    applications.forEach(app => {
      if (app.date) {  // ⚡ CHANGED FROM app.created_at to app.date
        try {
          const date = new Date(app.date);
          if (!isNaN(date.getTime()) && date >= last30Days && date <= today) {
            const dayKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const sortKey = date.toISOString().split('T')[0];
            
            dailyData[dayKey] = (dailyData[dayKey] || 0) + 1;
            dailySortMap[dayKey] = sortKey;
          }
        } catch (e) {
          console.error('Invalid date:', app.date);
        }
      }
    });

    const dailyTrend = Object.entries(dailyData)
      .map(([date, count]) => ({
        date,
        count,
        sortKey:  dailySortMap[date]
      }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .slice(-14)
      .map(({ date, count }) => ({ date, count }));

    console.log('📅 Daily Trend:', dailyTrend);

    // 5. TOP 10 POLICE STATIONS
    const psCount = {};
    applications.forEach(app => {
      if (app.police_station) {
        psCount[app.police_station] = (psCount[app.police_station] || 0) + 1;
      }
    });
    const topPS = Object.entries(psCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // 6. TOP 10 CATEGORIES
    const catCount = {};
    applications.forEach(app => {
      if (app.category) {
        catCount[app.category] = (catCount[app.category] || 0) + 1;
      }
    });
    const topCategories = Object.entries(catCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // 7. DIVISION PERFORMANCE
    const divisionData = {};
    applications.forEach(app => {
      if (app.division) {
        if (!divisionData[app.division]) {
          divisionData[app.division] = { name: app.division, total: 0, pending: 0, resolved: 0 };
        }
        divisionData[app. division].total++;
        if (app.status === 'PENDING') divisionData[app.division].pending++;
        if (app.status === 'CLOSED') divisionData[app.division].resolved++;
      }
    });
    const divisionPerformance = Object.values(divisionData)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    // 8. RESOLUTION TIME BY STATUS
    const calculateAvgDays = (status) => {
      const filtered = applications.filter(a => a.status === status && a.days);
      if (filtered.length === 0) return 0;
      const sum = filtered.reduce((acc, a) => acc + (a.days || 0), 0);
      return Math.round(sum / filtered.length);
    };

    const resolutionTime = [
      { status: 'PENDING', days: calculateAvgDays('PENDING') },
      { status: 'HEARD', days: calculateAvgDays('HEARD') },
      { status: 'REFERRED', days:  calculateAvgDays('REFERRED') },
      { status: 'CLOSED', days: calculateAvgDays('CLOSED') }
    ];

    // 9. TOP 8 SHOs
    const shoCount = {};
    applications.forEach(app => {
      if (app.marked_to) {
        shoCount[app. marked_to] = (shoCount[app.marked_to] || 0) + 1;
      }
    });
    const topSHOs = Object.entries(shoCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    // 10. STATUS BY POLICE STATION (STACKED)
    const psStatusData = {};
    applications.forEach(app => {
      if (app.police_station) {
        if (!psStatusData[app.police_station]) {
          psStatusData[app.police_station] = { 
            name: app.police_station, 
            PENDING:  0, 
            HEARD: 0, 
            REFERRED: 0, 
            CLOSED: 0 
          };
        }
        psStatusData[app.police_station][app.status]++;
      }
    });
    const statusByPS = Object. values(psStatusData)
      .sort((a, b) => (b.PENDING + b.HEARD + b. REFERRED + b.CLOSED) - (a.PENDING + a. HEARD + a.REFERRED + a.CLOSED))
      .slice(0, 8);

    // 11. CATEGORY VS FEEDBACK
    const catFeedback = {};
    applications.forEach(app => {
      if (app.category && app.feedback !== 'PENDING') {
        if (!catFeedback[app. category]) {
          catFeedback[app.category] = { name: app.category, POSITIVE:  0, NEGATIVE: 0 };
        }
        catFeedback[app.category][app.feedback]++;
      }
    });
    const categoryFeedback = Object.values(catFeedback)
      .sort((a, b) => (b.POSITIVE + b.NEGATIVE) - (a.POSITIVE + a.NEGATIVE))
      .slice(0, 8);

    // 12. PERFORMANCE RADAR
    const totalFeedback = feedbackDist.POSITIVE + feedbackDist.NEGATIVE;
    const satisfactionRate = totalFeedback > 0 ?  (feedbackDist.POSITIVE / totalFeedback * 100) : 0;
    
    const performanceMetrics = [
      { 
        metric: 'Resolution Rate', 
        value: applications.length > 0 ? parseFloat((statusDist.CLOSED / applications.length * 100).toFixed(1)) : 0 
      },
      { 
        metric: 'Positive Feedback', 
        value:  applications.length > 0 ? parseFloat((feedbackDist. POSITIVE / applications.length * 100).toFixed(1)) : 0 
      },
      { 
        metric: 'Timely Response', 
        value: applications. length > 0 ? parseFloat(((statusDist.HEARD + statusDist.CLOSED) / applications.length * 100).toFixed(1)) : 0 
      },
      { 
        metric: 'Case Load', 
        value: parseFloat((applications.length / 100).toFixed(1)) 
      },
      { 
        metric: 'Satisfaction', 
        value: parseFloat(satisfactionRate.toFixed(1)) 
      }
    ];

    console.log('✅ All metrics calculated from fresh DB data');

    return {
      statusDist,
      feedbackDist,
      monthlyTrend,
      dailyTrend,
      topPS,
      topCategories,
      divisionPerformance,
      resolutionTime,
      topSHOs,
      statusByPS,
      categoryFeedback,
      performanceMetrics
    };
  }, [applications]);

  const COLORS = {
    primary: ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd'],
    status: {
      PENDING: '#f59e0b',
      HEARD: '#10b981',
      REFERRED: '#6366f1',
      CLOSED:  '#6b7280'
    },
    feedback: {
      POSITIVE: '#10b981',
      NEGATIVE: '#ef4444',
      PENDING: '#6b7280'
    },
    gradient: ['#667eea', '#764ba2', '#f093fb', '#4facfe']
  };

  const exportData = () => {
    const timestamp = new Date().toLocaleString();
    const csvContent = `Analytics Report - Generated:  ${timestamp}\n\n` +
      `OVERALL STATISTICS\n` +
      `Total Applications: ${applications.length}\n` +
      `Pending:  ${metrics.statusDist.PENDING}\n` +
      `Heard: ${metrics.statusDist.HEARD}\n` +
      `Referred: ${metrics.statusDist.REFERRED}\n` +
      `Closed: ${metrics.statusDist.CLOSED}\n\n` +
      `FEEDBACK\n` +
      `Positive: ${metrics.feedbackDist.POSITIVE}\n` +
      `Negative: ${metrics.feedbackDist.NEGATIVE}\n` +
      `Pending: ${metrics.feedbackDist.PENDING}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document. createElement('a');
    a.href = url;
    a. download = `analytics_${new Date().toISOString().split('T')[0]}_${Date.now()}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="spinner-large"></div>
        <p>Loading Analytics from Database...</p>
      </div>
    );
  }

  const totalApps = applications.length;
  const resolutionRate = totalApps > 0 ? ((metrics.statusDist.CLOSED / totalApps) * 100).toFixed(1) : '0';
  const totalFeedback = metrics.feedbackDist.POSITIVE + metrics. feedbackDist.NEGATIVE;
  const positiveFeedbackRate = totalFeedback > 0 ? ((metrics.feedbackDist. POSITIVE / totalFeedback) * 100).toFixed(1) : '0';
  const avgResolutionDays = metrics.resolutionTime.find(r => r.status === 'CLOSED')?.days || 0;

  return (
    <div className="analytics-page">
      {/* Header */}
      <div className="analytics-header">
        <div className="analytics-header-left">
          <h1 className="analytics-title">
            <Activity size={32} />
            Analytics Dashboard
          </h1>
          <p className="analytics-subtitle">
            Punjab Police Open Court - Real-Time Data Insights
            {lastUpdate && (
              <span style={{ marginLeft: '1rem', opacity: 0.9 }}>
                • Last Updated: {lastUpdate. toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="analytics-header-right">
          <button onClick={fetchAllData} disabled={refreshing} className="analytics-btn-refresh">
            <RefreshCw size={20} className={refreshing ? 'spinning' : ''} />
            {refreshing ?  'Refreshing...' :  'Refresh Data'}
          </button>
          <button onClick={exportData} className="analytics-btn-export">
            <Download size={20} />
            Export Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-primary">
          <div className="kpi-icon">
            <FileText size={32} />
          </div>
          <div className="kpi-content">
            <h3 className="kpi-value">{totalApps. toLocaleString()}</h3>
            <p className="kpi-label">Total Applications</p>
            <div className="kpi-trend">
              <TrendingUp size={16} />
              <span>Live from Database</span>
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-warning">
          <div className="kpi-icon">
            <Clock size={32} />
          </div>
          <div className="kpi-content">
            <h3 className="kpi-value">{metrics.statusDist.PENDING. toLocaleString()}</h3>
            <p className="kpi-label">Pending Cases</p>
            <div className="kpi-trend">
              <AlertCircle size={16} />
              <span>{totalApps > 0 ? ((metrics.statusDist.PENDING / totalApps) * 100).toFixed(1) : 0}% of total</span>
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-success">
          <div className="kpi-icon">
            <CheckCircle size={32} />
          </div>
          <div className="kpi-content">
            <h3 className="kpi-value">{resolutionRate}%</h3>
            <p className="kpi-label">Resolution Rate</p>
            <div className="kpi-trend">
              <TrendingUp size={16} />
              <span>{metrics.statusDist.CLOSED} cases closed</span>
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-info">
          <div className="kpi-icon">
            <ThumbsUp size={32} />
          </div>
          <div className="kpi-content">
            <h3 className="kpi-value">{positiveFeedbackRate}%</h3>
            <p className="kpi-label">Positive Feedback</p>
            <div className="kpi-trend">
              <Award size={16} />
              <span>{metrics.feedbackDist.POSITIVE} positive reviews</span>
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-purple">
          <div className="kpi-icon">
            <Target size={32} />
          </div>
          <div className="kpi-content">
            <h3 className="kpi-value">{avgResolutionDays}</h3>
            <p className="kpi-label">Avg.  Resolution Days</p>
            <div className="kpi-trend">
              <Zap size={16} />
              <span>For closed cases</span>
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-gradient">
          <div className="kpi-icon">
            <MapPin size={32} />
          </div>
          <div className="kpi-content">
            <h3 className="kpi-value">{metrics.topPS.length}</h3>
            <p className="kpi-label">Active Stations</p>
            <div className="kpi-trend">
              <BarChart3 size={16} />
              <span>{metrics.divisionPerformance.length} divisions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Container */}
      <div className="charts-container">
        {/* Row 1: Status & Feedback Distribution */}
        <div className="chart-row">
          <div className="chart-card chart-card-half">
            <div className="chart-header">
              <h3>
                <PieChartIcon size={20} />
                Status Distribution
              </h3>
              <span className="chart-badge">Real-time from DB</span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Pending', value: metrics.statusDist.PENDING },
                    { name: 'Heard', value: metrics.statusDist.HEARD },
                    { name: 'Referred', value: metrics.statusDist. REFERRED },
                    { name:  'Closed', value: metrics.statusDist.CLOSED }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    COLORS.status.PENDING,
                    COLORS.status. HEARD,
                    COLORS. status.REFERRED,
                    COLORS.status.CLOSED
                  ].map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card chart-card-half">
            <div className="chart-header">
              <h3>
                <ThumbsUp size={20} />
                Feedback Analysis
              </h3>
              <span className="chart-badge chart-badge-success">Live Data</span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Positive', value: metrics.feedbackDist.POSITIVE },
                    { name: 'Negative', value: metrics.feedbackDist.NEGATIVE },
                    { name: 'Pending', value: metrics.feedbackDist. PENDING }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    COLORS.feedback.POSITIVE,
                    COLORS.feedback. NEGATIVE,
                    COLORS.feedback.PENDING
                  ].map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 2: Monthly Trends */}
        <div className="chart-card chart-card-full">
          <div className="chart-header">
            <h3>
              <TrendingUp size={20} />
              Monthly Application Trends
            </h3>
            <span className="chart-badge chart-badge-info">Last 6 Months</span>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={metrics.monthlyTrend}>
              <defs>
                <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor:  '#fff', 
                  border: '2px solid #3b82f6',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="applications" 
                stroke="#3b82f6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorApplications)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Row 3: Daily Trend */}
        <div className="chart-card chart-card-full">
          <div className="chart-header">
            <h3>
              <Activity size={20} />
              Daily Application Trend (Last 14 Days)
            </h3>
            <span className="chart-badge chart-badge-warning">Recent Activity</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={metrics.dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '2px solid #10b981',
                  borderRadius: '8px'
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#10b981" 
                strokeWidth={3}
                dot={{ fill: '#10b981', r: 5 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Row 4: Top Police Stations */}
        <div className="chart-card chart-card-full">
          <div className="chart-header">
            <h3>
              <MapPin size={20} />
              Top 10 Police Stations by Application Volume
            </h3>
            <span className="chart-badge">Real-time Ranking</span>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={metrics.topPS} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" stroke="#64748b" />
              <YAxis dataKey="name" type="category" width={150} stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor:  '#fff', 
                  border: '2px solid #1e40af',
                  borderRadius: '8px'
                }} 
              />
              <Bar dataKey="count" fill="#1e40af" radius={[0, 8, 8, 0]}>
                {metrics.topPS.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS.primary[index % 4]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Row 5: Top Categories */}
        <div className="chart-card chart-card-full">
          <div className="chart-header">
            <h3>
              <BarChart3 size={20} />
              Top 10 Crime Categories
            </h3>
            <span className="chart-badge chart-badge-purple">Most Common</span>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={metrics.topCategories} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" stroke="#64748b" />
              <YAxis dataKey="name" type="category" width={180} stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '2px solid #8b5cf6',
                  borderRadius: '8px'
                }} 
              />
              <Bar dataKey="count" fill="#8b5cf6" radius={[0, 8, 8, 0]}>
                {metrics.topCategories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS.gradient[index % 4]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Row 6: Division Performance */}
        <div className="chart-card chart-card-full">
          <div className="chart-header">
            <h3>
              <Target size={20} />
              Division Performance Analysis
            </h3>
            <span className="chart-badge chart-badge-success">Comparative View</span>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={metrics.divisionPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '2px solid #10b981',
                  borderRadius: '8px'
                }} 
              />
              <Legend />
              <Bar dataKey="total" fill="#3b82f6" name="Total Cases" radius={[8, 8, 0, 0]} />
              <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[8, 8, 0, 0]} />
              <Bar dataKey="resolved" fill="#10b981" name="Resolved" radius={[8, 8, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Row 7: Resolution Time & Performance Radar */}
        <div className="chart-row">
          <div className="chart-card chart-card-half">
            <div className="chart-header">
              <h3>
                <Clock size={20} />
                Average Resolution Time by Status
              </h3>
              <span className="chart-badge chart-badge-warning">Days</span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={metrics.resolutionTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="status" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '2px solid #f59e0b',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="days" fill="#f59e0b" radius={[8, 8, 0, 0]}>
                  {metrics.resolutionTime.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={Object.values(COLORS.status)[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card chart-card-half">
            <div className="chart-header">
              <h3>
                <Activity size={20} />
                Overall Performance Metrics
              </h3>
              <span className="chart-badge chart-badge-info">360° View</span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={metrics.performanceMetrics}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="metric" stroke="#64748b" />
                <PolarRadiusAxis stroke="#64748b" />
                <Radar 
                  name="Performance" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.6} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '2px solid #3b82f6',
                    borderRadius: '8px'
                  }} 
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 8: Top SHOs */}
        <div className="chart-card chart-card-full">
          <div className="chart-header">
            <h3>
              <Award size={20} />
              Top 8 Performing SHOs (By Case Load)
            </h3>
            <span className="chart-badge chart-badge-success">Recognition</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.topSHOs}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" angle={-45} textAnchor="end" height={100} />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border:  '2px solid #10b981',
                  borderRadius: '8px'
                }} 
              />
              <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Row 9: Status by Police Station (Stacked) */}
        <div className="chart-card chart-card-full">
          <div className="chart-header">
            <h3>
              <BarChart3 size={20} />
              Case Status Breakdown by Top Police Stations
            </h3>
            <span className="chart-badge chart-badge-purple">Stacked View</span>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={metrics.statusByPS}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" angle={-45} textAnchor="end" height={120} />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border:  '2px solid #6366f1',
                  borderRadius: '8px'
                }} 
              />
              <Legend />
              <Bar dataKey="PENDING" stackId="a" fill={COLORS.status.PENDING} name="Pending" />
              <Bar dataKey="HEARD" stackId="a" fill={COLORS.status. HEARD} name="Heard" />
              <Bar dataKey="REFERRED" stackId="a" fill={COLORS.status. REFERRED} name="Referred" />
              <Bar dataKey="CLOSED" stackId="a" fill={COLORS.status.CLOSED} name="Closed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Row 10: Category vs Feedback */}
        <div className="chart-card chart-card-full">
          <div className="chart-header">
            <h3>
              <ThumbsUp size={20} />
              Feedback Distribution by Top Categories
            </h3>
            <span className="chart-badge">Grouped Analysis</span>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={metrics.categoryFeedback}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" angle={-45} textAnchor="end" height={120} />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '2px solid #10b981',
                  borderRadius: '8px'
                }} 
              />
              <Legend />
              <Bar dataKey="POSITIVE" fill={COLORS.feedback.POSITIVE} name="Positive Feedback" radius={[8, 8, 0, 0]} />
              <Bar dataKey="NEGATIVE" fill={COLORS.feedback. NEGATIVE} name="Negative Feedback" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Analytics;