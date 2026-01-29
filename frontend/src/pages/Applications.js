import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getApplications, 
  getPoliceStations, 
  getCategories,
  updateApplicationStatus,
  updateApplicationFeedback 
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  Phone, 
  Eye,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  FileText,
  ChevronUp,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import './Applications.css';

const Applications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Data State
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [policeStations, setPoliceStations] = useState([]);
  const [selectedPS, setSelectedPS] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [feedbackFilter, setFeedbackFilter] = useState('');
  
  // Date Filter State
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // Sorting State
  const [sortField, setSortField] = useState('sr_no');
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
    fetchApplications();
    fetchMetadata();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const data = await getApplications({});
      setApplications(data.results || data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [psData, catData] = await Promise.all([
        getPoliceStations(),
        getCategories()
      ]);
      setPoliceStations(psData);
      setCategories(catData);
    } catch (error) {
      console.error('Error fetching metadata:', error);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await updateApplicationStatus(id, newStatus);
      fetchApplications();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleFeedbackUpdate = async (id, feedback) => {
    try {
      await updateApplicationFeedback(id, feedback, '');
      fetchApplications();
    } catch (error) {
      console.error('Error updating feedback:', error);
      alert('Failed to update feedback');
    }
  };

  const handleCall = (contact) => {
    window.location.href = `tel:${contact}`;
  };

  // Sorting Handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Export to Excel Function (WITHOUT CREATED AT)
  const exportToExcel = () => {
    try {
      // Prepare data for export
      const exportData = processedData.map((app, index) => ({
        'SR NO': app.sr_no || '',
        'DAIRY NO': app.dairy_no || '',
        'NAME': app.name || '',
        'CONTACT': app.contact || '',
        'POLICE STATION': app.police_station || '',
        'DIVISION': app.division || 'N/A',
        'CATEGORY': app.category || '',
        'MARKED TO': app.marked_to || 'N/A',
        'STATUS': app.status || '',
        'FEEDBACK': app.feedback || '',
        'DATE': app.date ? formatDate(app.date) : 'N/A'
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const colWidths = [
        { wch: 8 },  // SR NO
        { wch: 15 }, // DAIRY NO
        { wch: 25 }, // NAME
        { wch: 15 }, // CONTACT
        { wch: 20 }, // POLICE STATION
        { wch: 15 }, // DIVISION
        { wch: 25 }, // CATEGORY
        { wch: 20 }, // MARKED TO
        { wch: 12 }, // STATUS
        { wch: 12 }, // FEEDBACK
        { wch: 15 }  // DATE
      ];
      ws['!cols'] = colWidths;

      // Style the header row
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + "1";
        if (!ws[address]) continue;
        ws[address].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "3B82F6" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Applications');

      // Generate filename with date and filters
      const today = new Date().toISOString().split('T')[0];
      let filename = `Open_Court_Applications_${today}`;
      
      if (fromDate && toDate) {
        filename += `_${fromDate}_to_${toDate}`;
      } else if (fromDate) {
        filename += `_from_${fromDate}`;
      } else if (toDate) {
        filename += `_until_${toDate}`;
      }
      
      if (selectedPS) {
        filename += `_${selectedPS.replace(/\s+/g, '_')}`;
      }
      
      filename += '.xlsx';

      // Save file
      XLSX.writeFile(wb, filename);

      // Show success message
      alert(`✅ Successfully exported ${exportData.length} applications to Excel!`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('❌ Failed to export to Excel. Please try again.');
    }
  };

  // Filter, Sort, and Paginate Data
  const processedData = useMemo(() => {
    let filtered = [...applications];

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(app =>
        app.name?.toLowerCase().includes(searchLower) ||
        app.dairy_no?.toLowerCase().includes(searchLower) ||
        app.contact?.toLowerCase().includes(searchLower) ||
        app.sr_no?.toString().includes(searchLower)
      );
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    // Apply police station filter
    if (selectedPS) {
      filtered = filtered.filter(app => app.police_station === selectedPS);
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(app => app.category === selectedCategory);
    }

    // Apply feedback filter
    if (feedbackFilter) {
      filtered = filtered.filter(app => app.feedback === feedbackFilter);
    }

    // Apply date range filter
    if (fromDate) {
      filtered = filtered.filter(app => {
        if (!app.date) return false;
        return new Date(app.date) >= new Date(fromDate);
      });
    }

    if (toDate) {
      filtered = filtered.filter(app => {
        if (!app.date) return false;
        return new Date(app.date) <= new Date(toDate);
      });
    }

    // Sort data
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (sortDirection === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });

    return filtered;
  }, [applications, search, statusFilter, selectedPS, selectedCategory, feedbackFilter, fromDate, toDate, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = processedData.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, selectedPS, selectedCategory, feedbackFilter, fromDate, toDate]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PK', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      'PENDING': 'badge badge-warning',
      'HEARD': 'badge badge-success',
      'REFERRED': 'badge badge-info',
      'CLOSED': 'badge badge-secondary'
    };
    return classes[status] || 'badge badge-secondary';
  };

  const getFeedbackBadgeClass = (feedback) => {
    const classes = {
      'POSITIVE': 'badge badge-success',
      'NEGATIVE': 'badge badge-danger',
      'PENDING': 'badge badge-secondary'
    };
    return classes[feedback] || 'badge badge-secondary';
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setSelectedPS('');
    setSelectedCategory('');
    setFeedbackFilter('');
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) {
      return <ChevronDown size={14} className="sort-icon-inactive" />;
    }
    return sortDirection === 'asc' ? 
      <ChevronUp size={14} className="sort-icon-active" /> : 
      <ChevronDown size={14} className="sort-icon-active" />;
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={`pagination-btn ${currentPage === i ? 'active' : ''}`}
        >
          {i}
        </button>
      );
    }

    return buttons;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading applications...</p>
      </div>
    );
  }

  const hasActiveFilters = search || statusFilter || selectedPS || selectedCategory || feedbackFilter || fromDate || toDate;

  return (
    <div className="applications-table-page">
      {/* Header */}
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Open Court Applications</h2>
          <p className="page-subtitle">
            Total: <strong>{processedData.length}</strong> applications
            {processedData.length !== applications.length && 
              ` (filtered from ${applications.length})`
            }
          </p>
        </div>
        <div className="header-actions">
          {/* Export to Excel Button */}
          <button 
            onClick={exportToExcel} 
            className="export-excel-btn"
            disabled={processedData.length === 0}
            title="Export to Excel"
          >
            <Download size={18} />
            Export to Excel
          </button>
          <button onClick={fetchApplications} className="refresh-btn">
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>
      </div>

      {/* Single Row Filters */}
      <div className="filters-container-compact">
        <div className="search-box-main">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by name, dairy no, contact, SR no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="clear-icon-btn">
              <X size={18} />
            </button>
          )}
        </div>

        {/* From Date Input */}
        <div className="date-input-wrapper">
          <Calendar size={18} className="date-icon" />
          <input
            type="date"
            className="filter-date-input"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            placeholder="From Date"
            title="From Date"
          />
          {fromDate && (
            <button onClick={() => setFromDate('')} className="clear-date-btn">
              <X size={14} />
            </button>
          )}
        </div>

        {/* To Date Input */}
        <div className="date-input-wrapper">
          <Calendar size={18} className="date-icon" />
          <input
            type="date"
            className="filter-date-input"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            placeholder="To Date"
            title="To Date"
          />
          {toDate && (
            <button onClick={() => setToDate('')} className="clear-date-btn">
              <X size={14} />
            </button>
          )}
        </div>

        <select 
          className="filter-select-compact" 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="HEARD">Heard</option>
          <option value="REFERRED">Referred</option>
          <option value="CLOSED">Closed</option>
        </select>

        <select 
          className="filter-select-compact" 
          value={selectedPS} 
          onChange={(e) => setSelectedPS(e.target.value)}
        >
          <option value="">All Police Stations</option>
          {policeStations.map((ps, idx) => (
            <option key={idx} value={ps}>{ps}</option>
          ))}
        </select>

        <select 
          className="filter-select-compact" 
          value={selectedCategory} 
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((cat, idx) => (
            <option key={idx} value={cat}>{cat}</option>
          ))}
        </select>

        <select 
          className="filter-select-compact" 
          value={feedbackFilter} 
          onChange={(e) => setFeedbackFilter(e.target.value)}
        >
          <option value="">All Feedback</option>
          <option value="POSITIVE">Positive</option>
          <option value="NEGATIVE">Negative</option>
          <option value="PENDING">Pending</option>
        </select>

        {hasActiveFilters && (
          <button onClick={clearFilters} className="clear-all-btn">
            <X size={16} />
            Clear
          </button>
        )}
      </div>

      {/* Table with Scrollbars */}
      <div className="table-container">
        <div className="table-scroll-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('sr_no')} className="sortable-header">
                  <div className="th-content">
                    SR NO <SortIcon field="sr_no" />
                  </div>
                </th>
                <th onClick={() => handleSort('dairy_no')} className="sortable-header">
                  <div className="th-content">
                    DAIRY NO <SortIcon field="dairy_no" />
                  </div>
                </th>
                <th onClick={() => handleSort('name')} className="sortable-header">
                  <div className="th-content">
                    NAME <SortIcon field="name" />
                  </div>
                </th>
                <th>CONTACT</th>
                <th onClick={() => handleSort('police_station')} className="sortable-header">
                  <div className="th-content">
                    POLICE STATION <SortIcon field="police_station" />
                  </div>
                </th>
                <th onClick={() => handleSort('division')} className="sortable-header">
                  <div className="th-content">
                    DIVISION <SortIcon field="division" />
                  </div>
                </th>
                <th onClick={() => handleSort('category')} className="sortable-header">
                  <div className="th-content">
                    CATEGORY <SortIcon field="category" />
                  </div>
                </th>
                <th onClick={() => handleSort('marked_to')} className="sortable-header">
                  <div className="th-content">
                    MARKED TO <SortIcon field="marked_to" />
                  </div>
                </th>
                <th onClick={() => handleSort('status')} className="sortable-header">
                  <div className="th-content">
                    STATUS <SortIcon field="status" />
                  </div>
                </th>
                <th onClick={() => handleSort('feedback')} className="sortable-header">
                  <div className="th-content">
                    FEEDBACK <SortIcon field="feedback" />
                  </div>
                </th>
                <th onClick={() => handleSort('date')} className="sortable-header">
                  <div className="th-content">
                    DATE <SortIcon field="date" />
                  </div>
                </th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {currentData.length === 0 ? (
                <tr>
                  <td colSpan="12" className="no-data-cell">
                    <FileText size={48} color="#ccc" />
                    <p>No applications found</p>
                  </td>
                </tr>
              ) : (
                currentData.map((app) => (
                  <tr key={app.id} className="data-row">
                    <td className="cell-sr">{app.sr_no}</td>
                    <td className="cell-dairy">{app.dairy_no}</td>
                    <td className="cell-name">{app.name}</td>
                    <td className="cell-contact">
                      <button 
                        onClick={() => handleCall(app.contact)} 
                        className="phone-btn"
                        title="Call"
                      >
                        <Phone size={14} />
                        {app.contact}
                      </button>
                    </td>
                    <td className="cell-ps">{app.police_station}</td>
                    <td className="cell-division">{app.division || 'N/A'}</td>
                    <td className="cell-category">{app.category}</td>
                    <td className="cell-marked">{app.marked_to || 'N/A'}</td>
                    <td className="cell-status">
                      <span className={getStatusBadgeClass(app.status)}>
                        {app.status}
                      </span>
                    </td>
                    <td className="cell-feedback">
                      <span className={getFeedbackBadgeClass(app.feedback)}>
                        {app.feedback}
                      </span>
                    </td>
                    <td className="cell-date">{formatDate(app.date)}</td>
                    <td className="cell-actions">
                      <button 
                        onClick={() => navigate(`/applications/${app.id}`)}
                        className="view-btn"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination-container">
          <div className="pagination-info">
            Showing {startIndex + 1} to {Math.min(endIndex, processedData.length)} of {processedData.length} entries
          </div>
          <div className="pagination-controls">
            <button 
              onClick={() => setCurrentPage(1)} 
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              <ChevronsLeft size={18} />
            </button>
            <button 
              onClick={() => setCurrentPage(currentPage - 1)} 
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              <ChevronLeft size={18} />
            </button>
            
            {renderPaginationButtons()}
            
            <button 
              onClick={() => setCurrentPage(currentPage + 1)} 
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              <ChevronRight size={18} />
            </button>
            <button 
              onClick={() => setCurrentPage(totalPages)} 
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              <ChevronsRight size={18} />
            </button>
          </div>
          <div className="items-per-page">
            <label>Items per page:</label>
            <select 
              value={itemsPerPage} 
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default Applications;