import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Ticket, LogOut, Search, Plus, User, CheckCircle,
  AlertCircle, Sparkles, Send, RefreshCw,
  Users, Trash2, Shield, X, HelpCircle,
  ChevronLeft, ChevronRight, Menu
} from 'lucide-react';

const Dashboard = () => {
  const { user, logout, token } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Navigation tabs: 'tickets' or 'agents' (Admin only)
  const [activeTab, setActiveTab] = useState('tickets');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState(''); // 'all', 'me', 'unassigned'

  // Panel collapse states — sidebar open by default, detail panel closed by default
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);

  // Modal / Form states
  const [showSimulator, setShowSimulator] = useState(false);
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  // Simulator input
  const [simName, setSimName] = useState('');
  const [simEmail, setSimEmail] = useState('');
  const [simSubject, setSimSubject] = useState('');
  const [simBody, setSimBody] = useState('');

  // New Agent input
  const [agentName, setAgentName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [agentPassword, setAgentPassword] = useState('');
  const [agentFormError, setAgentFormError] = useState('');

  // Status indicators
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [submittingSimulator, setSubmittingSimulator] = useState(false);
  const [submittingAgent, setSubmittingAgent] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [reprocessingAI, setReprocessingAI] = useState(false);
  const [updatingTicketId, setUpdatingTicketId] = useState(null);

  // Toasts
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const getHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // Fetch Tickets
  const fetchTickets = async () => {
    setLoadingTickets(true);
    try {
      // Build query string
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (searchQuery) params.append('search', searchQuery);
      if (assignmentFilter === 'me') {
        params.append('assignedToId', user.id);
      }

      const res = await fetch(`/api/tickets?${params.toString()}`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data);

        // Update selected ticket in place if it's currently selected
        if (selectedTicket) {
          const updated = data.find(t => t.id === selectedTicket.id);
          if (updated) {
            // Need to fetch full detail with audit logs
            fetchTicketDetails(updated.id);
          }
        }
      } else {
        addToast('Failed to fetch tickets.', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Error loading tickets.', 'error');
    } finally {
      setLoadingTickets(false);
    }
  };

  // Fetch Ticket Details (including audit logs)
  const fetchTicketDetails = async (id) => {
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data);
      }
    } catch (err) {
      console.error('Error fetching ticket details:', err);
    }
  };

  // Fetch Agents (Admin only)
  const fetchAgents = async () => {
    if (user?.role !== 'ADMIN') return;
    setLoadingAgents(true);
    try {
      const res = await fetch('/api/agents', {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAgents(false);
    }
  };

  // Run on filters / search change
  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter, assignmentFilter, searchQuery]);

  // Run on init
  useEffect(() => {
    fetchTickets();
    fetchAgents();
  }, [user]);

  // Periodically refresh tickets AND agents to reflect auto-assignments in real time
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTickets();
      fetchAgents();
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedTicket, statusFilter, priorityFilter, assignmentFilter, searchQuery]);

  // Handle Ticket Attribute Update (Priority, Status, Assignment)
  const handleUpdateTicket = async (id, fields) => {
    setUpdatingTicketId(id);
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(fields),
      });

      if (res.ok) {
        addToast('Ticket updated successfully.', 'success');
        fetchTickets();
      } else {
        const data = await res.json();
        addToast(data.error || 'Failed to update ticket.', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Error updating ticket.', 'error');
    } finally {
      setUpdatingTicketId(null);
    }
  };

  // Handle AI Summary request
  const handleGenerateSummary = async (id) => {
    setGeneratingSummary(true);
    try {
      const res = await fetch(`/api/tickets/${id}/summarize`, {
        method: 'POST',
        headers: getHeaders(),
      });

      if (res.ok) {
        addToast('AI Summary generated.', 'success');
        fetchTicketDetails(id);
        fetchTickets(); // Refresh list to ensure synced
      } else {
        addToast('Failed to generate summary.', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Error communicating with AI.', 'error');
    } finally {
      setGeneratingSummary(false);
    }
  };

  // Handle AI Reprocess request (Admin only)
  const handleReprocessAI = async (id) => {
    setReprocessingAI(true);
    try {
      const res = await fetch(`/api/tickets/${id}/reprocess`, {
        method: 'POST',
        headers: getHeaders(),
      });

      if (res.ok) {
        addToast('Ticket reprocessed by Gemini.', 'success');
        fetchTicketDetails(id);
        fetchTickets();
      } else {
        addToast('Failed to reprocess ticket.', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Error reprocessing ticket.', 'error');
    } finally {
      setReprocessingAI(false);
    }
  };

  // Delete Ticket (Admin only)
  const handleDeleteTicket = async (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Ticket',
      message: 'Are you sure you want to delete this ticket? This action cannot be undone.',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/tickets/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
          });

          if (res.ok) {
            addToast('Ticket deleted.', 'success');
            setSelectedTicket(null);
            fetchTickets();
          } else {
            addToast('Failed to delete ticket.', 'error');
          }
        } catch (err) {
          console.error(err);
          addToast('Error deleting ticket.', 'error');
        } finally {
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
        }
      }
    });
  };

  // Handle Email Simulator Submit
  const handleSimulateEmail = async (e) => {
    e.preventDefault();
    if (!simName || !simEmail || !simSubject || !simBody) {
      addToast('All simulator fields are required.', 'error');
      return;
    }

    setSubmittingSimulator(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          customerName: simName,
          customerEmail: simEmail,
          subject: simSubject,
          body: simBody
        })
      });

      if (res.ok) {
        addToast('Email sent! AI is processing in the background.', 'success');
        setShowSimulator(false);
        // Clear inputs
        setSimName('');
        setSimEmail('');
        setSimSubject('');
        setSimBody('');
        // Refresh list
        fetchTickets();
      } else {
        addToast('Simulator failed to send email.', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Error simulated sending.', 'error');
    } finally {
      setSubmittingSimulator(false);
    }
  };

  // Pre-fill simulator templates
  const applySimTemplate = (type) => {
    if (type === 'easy') {
      setSimName('Sarah Jenkins');
      setSimEmail('sarah.j@gmail.com');
      setSimSubject('Question about Python course certificate');
      setSimBody(`Hello support team,

I completed the Python Fundamentals course yesterday. How do I download my certificate of completion? I checked my account dashboard but couldn't find the link.

Thanks,
Sarah`);
    } else if (type === 'medium') {
      setSimName('David Chen');
      setSimEmail('dchen99@yahoo.com');
      setSimSubject('Cannot log in to my account');
      setSimBody(`Hi,

I tried logging in today to resume my Javascript lessons, but the site says "Invalid credentials". I am sure my password is correct. Can you please help me reset my password or check my account status? My registered email is dchen99@yahoo.com.

Best,
David`);
    } else if (type === 'hard') {
      setSimName('Emma Watson');
      setSimEmail('emma.watson@domain.com');
      setSimSubject('Double charged and no course access');
      setSimBody(`URGENT SUPPORT NEEDED.

I attempted to purchase the Full Stack Web Development course today. The transaction failed twice on your website, but I just checked my bank statement and I was charged twice ($199 x 2). To make it worse, my dashboard still says I have no active courses. 

I need a refund for the duplicate charge and immediate access to the course. This is extremely frustrating.

Emma`);
    }
  };

  // Handle Agent Creation (Admin only)
  const handleCreateAgent = async (e) => {
    e.preventDefault();
    setAgentFormError('');

    if (!agentName || !agentEmail || !agentPassword) {
      setAgentFormError('All fields are required.');
      return;
    }

    setSubmittingAgent(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name: agentName,
          email: agentEmail,
          password: agentPassword
        }),
      });

      const data = await res.json();

      if (res.ok) {
        addToast(`Agent ${agentName} created successfully.`, 'success');
        setAgentName('');
        setAgentEmail('');
        setAgentPassword('');
        setShowAgentForm(false);
        fetchAgents();
      } else {
        setAgentFormError(data.error || 'Failed to create agent.');
      }
    } catch (err) {
      console.error(err);
      setAgentFormError('Error connecting to backend.');
    } finally {
      setSubmittingAgent(false);
    }
  };

  // Delete Agent (Admin only)
  const handleDeleteAgent = async (agentId) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Agent',
      message: 'Are you sure you want to delete this agent? This action cannot be undone.',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/agents/${agentId}`, {
            method: 'DELETE',
            headers: getHeaders(),
          });

          if (res.ok) {
            addToast('Agent deleted.', 'success');
            fetchAgents();
          } else {
            addToast('Failed to delete agent.', 'error');
          }
        } catch (err) {
          console.error(err);
          addToast('Error deleting agent.', 'error');
        } finally {
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
        }
      }
    });
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'LOW': return 'badge-priority-low';
      case 'MEDIUM': return 'badge-priority-medium';
      case 'HIGH': return 'badge-priority-high';
      case 'URGENT': return 'badge-priority-urgent';
      default: return 'badge-priority-low';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toUpperCase()) {
      case 'RESOLVED': return 'badge-status-resolved';
      case 'PENDING': return 'badge-status-pending';
      case 'REVIEW_NEEDED': return 'badge-status-review_needed';
      default: return 'badge-status-pending';
    }
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="app-container">
      {/* Toast Alert Box */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className="toast" style={{
            borderLeft: `4px solid ${t.type === 'success' ? 'var(--status-resolved)' : t.type === 'error' ? 'var(--priority-high)' : 'var(--accent-primary)'}`
          }}>
            <Sparkles size={16} style={{ color: t.type === 'success' ? 'var(--status-resolved)' : 'inherit' }} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Header / Navbar */}
      <header className="navbar">
        <div className="container navbar-content">
          <div className="navbar-brand">
            <Ticket size={24} />
            <span>Helpdesk Support</span>
          </div>
          <div className="navbar-user">
            <button className="btn btn-secondary" style={{ width: 'auto', gap: '6px', fontSize: '13px', padding: '6px 12px' }} onClick={() => setShowSimulator(true)}>
              <Send size={14} />
              <span>Email Simulator</span>
            </button>
            <div className="user-info">
              <span className="user-name">{user?.name}</span>
              <span className="user-role" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                {user?.role === 'ADMIN' && <Shield size={10} style={{ color: 'var(--accent-primary)' }} />}
                {user?.role}
              </span>
            </div>
            <button className="btn btn-secondary btn-logout" onClick={logout}>
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div
        className="dashboard-grid"
        style={{
          gridTemplateColumns: activeTab === 'agents'
            ? (sidebarOpen ? '260px 1fr' : '0px 1fr')
            : (sidebarOpen
                ? (detailOpen ? '260px 1fr 400px' : '260px 1fr 0px')
                : (detailOpen ? '0px 1fr 400px' : '0px 1fr 0px')
              ),
          transition: 'grid-template-columns 0.25s ease',
        }}
      >

        {/* Left Sidebar */}
        <aside className="sidebar" style={{
          overflow: sidebarOpen ? 'auto' : 'hidden',
          minWidth: sidebarOpen ? '260px' : '0px',
          padding: sidebarOpen ? '24px' : '0px',
          transition: 'all 0.25s ease',
          borderRight: sidebarOpen ? '1px solid var(--border-color)' : 'none',
          position: 'relative',
        }}>
          {/* Collapse Arrow — anchored to the right edge of sidebar */}


          {sidebarOpen && <>
          <div>
            <h3 className="sidebar-title">Workspace</h3>
            <ul className="nav-list">
              <li>
                <button
                  className={`nav-item-btn ${activeTab === 'tickets' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tickets')}
                >
                  <Ticket size={16} />
                  <span>Tickets Dashboard</span>
                </button>
              </li>
              {user?.role === 'ADMIN' && (
                <li>
                  <button
                    className={`nav-item-btn ${activeTab === 'agents' ? 'active' : ''}`}
                    onClick={() => setActiveTab('agents')}
                  >
                    <Users size={16} />
                    <span>Agent Management</span>
                  </button>
                </li>
              )}
            </ul>
          </div>

          {activeTab === 'tickets' && (
            <div>
              <h3 className="sidebar-title">My Assignments</h3>
              <ul className="nav-list">
                <li>
                  <button
                    className={`nav-item-btn ${assignmentFilter === '' ? 'active' : ''}`}
                    onClick={() => setAssignmentFilter('')}
                  >
                    <span>All Tickets</span>
                  </button>
                </li>
                <li>
                  <button
                    className={`nav-item-btn ${assignmentFilter === 'me' ? 'active' : ''}`}
                    onClick={() => setAssignmentFilter('me')}
                  >
                    <span>Assigned to me</span>
                  </button>
                </li>
              </ul>
            </div>
          )}

          <div style={{ marginTop: 'auto', padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Sparkles size={14} style={{ color: 'var(--accent-primary)' }} />
              <span style={{ fontSize: '12px', fontWeight: 600 }}>Autopilot Active</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Low & Medium solvable issues will be resolved instantly by Gemini.
            </p>
          </div>
          </>}
        </aside>

        {/* Center Panel: Main Contents */}
        {activeTab === 'tickets' ? (
          <main className="ticket-list-container">
            {/* Search and Filters Header */}
            <div className="search-header">
              {/* Hamburger — toggles left sidebar */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                title={sidebarOpen ? 'Close Workspace' : 'Open Workspace'}
                className="btn btn-secondary"
                style={{ width: 'auto', padding: '8px', flexShrink: 0 }}
              >
                <Menu size={18} />
              </button>

              <div className="search-input-wrapper">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by student name, email, subject..."
                  className="search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending Review</option>
                <option value="REVIEW_NEEDED">AI Draft - Review Needed</option>
                <option value="RESOLVED">Resolved (Auto-Reply)</option>
              </select>

              <select
                className="filter-select"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>

              <button className="btn btn-secondary" style={{ width: 'auto', padding: '8px' }} onClick={fetchTickets}>
                <RefreshCw size={16} />
              </button>
            </div>

            {/* Scrollable Tickets List */}
            <div className="tickets-scroll">
              {loadingTickets && tickets.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: 'var(--text-muted)' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }} />
                  <span>Loading tickets...</span>
                </div>
              ) : tickets.length === 0 ? (
                <div className="empty-state">
                  <HelpCircle className="empty-state-icon" size={48} />
                  <h3>No tickets found</h3>
                  <p style={{ marginTop: '4px' }}>Try adjusting your search query or filters.</p>
                </div>
              ) : (
                tickets.map((t) => (
                  <div
                    key={t.id}
                    className={`ticket-card ${selectedTicket?.id === t.id ? 'selected' : ''}`}
                    onClick={() => {
                      fetchTicketDetails(t.id);
                      setDetailOpen(true);
                    }}
                  >
                    <div className="ticket-card-header">
                      <h4 className="ticket-subject">{t.subject}</h4>
                      <span className={`badge ${getPriorityBadgeClass(t.priority)}`}>
                        {t.priority}
                      </span>
                    </div>

                    <div className="ticket-card-meta">
                      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{t.customerName}</span>
                      <span className="meta-dot"></span>
                      <span>{t.customerEmail}</span>
                      <span className="meta-dot"></span>
                      <span>{formatDate(t.createdAt)}</span>
                    </div>

                    <div className="ticket-card-footer">
                      <span className={`badge ${getStatusBadgeClass(t.status)}`}>
                        {t.status === 'REVIEW_NEEDED' ? 'AI Review Needed' : t.status}
                      </span>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {t.aiAutoReplied && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--status-resolved)', fontWeight: 500 }}>
                            <Sparkles size={12} />
                            AI Auto-Replied
                          </span>
                        )}
                        {t.assignedTo && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <User size={12} />
                            {t.assignedTo.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </main>
        ) : (
          /* Agent Management Panel (Admin Only) */
          <main className="agent-list-panel">
            <div className="panel-header">
              <div>
                <h2>Support Agents</h2>
                <p>Add and manage customer support agent accounts</p>
              </div>
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowAgentForm(!showAgentForm)}>
                {showAgentForm ? <X size={16} /> : <Plus size={16} />}
                <span>{showAgentForm ? 'Cancel' : 'Add New Agent'}</span>
              </button>
            </div>

            {showAgentForm && (
              <div className="auth-card" style={{ maxWidth: '100%', marginBottom: '24px', padding: '24px' }}>
                <h3 style={{ marginBottom: '16px' }}>Register Support Agent</h3>
                {agentFormError && (
                  <div className="form-alert" style={{ marginBottom: '16px' }}>
                    <AlertCircle size={16} />
                    <span>{agentFormError}</span>
                  </div>
                )}
                <form onSubmit={handleCreateAgent}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label className="form-label">Full Name</label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder="John Doe"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Email Address</label>
                      <input
                        className="form-input"
                        type="email"
                        placeholder="john.doe@helpdesk.com"
                        value={agentEmail}
                        onChange={(e) => setAgentEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Temporary Password</label>
                      <input
                        className="form-input"
                        type="password"
                        placeholder="AgentPassword@123"
                        value={agentPassword}
                        onChange={(e) => setAgentPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary" type="submit" style={{ width: 'auto' }} disabled={submittingAgent}>
                      {submittingAgent ? 'Creating...' : 'Create Agent Account'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="table-wrapper">
              {loadingAgents ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading agents list...</div>
              ) : agents.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No agents registered yet.</div>
              ) : (
                <table className="agent-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Assigned Tickets</th>
                      <th>Created On</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((agent) => (
                      <tr key={agent.id}>
                        <td style={{ fontWeight: 600 }}>{agent.name}</td>
                        <td>{agent.email}</td>
                        <td>{agent.role}</td>
                        <td>{agent._count?.tickets || 0} active</td>
                        <td>{new Date(agent.createdAt).toLocaleDateString()}</td>
                        <td>
                          <button
                            className="btn-icon btn-icon-danger"
                            onClick={() => handleDeleteAgent(agent.id)}
                            title="Delete Agent"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </main>
        )}

        {/* Right Panel: Detail View (Only if activeTab is tickets) */}
        {activeTab === 'tickets' && (
          <aside
            className="detail-panel"
            style={{
              overflow: 'hidden',
              minWidth: detailOpen ? '400px' : '0px',
              width: detailOpen ? '400px' : '0px',
              borderLeft: detailOpen ? '1px solid var(--border-color)' : 'none',
              transition: 'all 0.25s ease',
              position: 'relative',
            }}
          >
            {/* Detail Panel Toggle Arrow — anchored to left edge */}
            <button
              onClick={() => setDetailOpen(!detailOpen)}
              title={detailOpen ? 'Close Detail Panel' : 'Open Detail Panel'}
              style={{
                position: 'absolute',
                left: '-14px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-md)',
                color: 'var(--text-secondary)',
              }}
            >
              {detailOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
            {selectedTicket ? (
              <>
                <div className="detail-header">
                  <div className="detail-subject-row">
                    <h3 className="detail-subject">{selectedTicket.subject}</h3>
                    {user?.role === 'ADMIN' && (
                      <button
                        className="btn-icon btn-icon-danger"
                        onClick={() => handleDeleteTicket(selectedTicket.id)}
                        title="Delete Ticket"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span className={`badge ${getPriorityBadgeClass(selectedTicket.priority)}`}>
                      {selectedTicket.priority}
                    </span>
                    <span className={`badge ${getStatusBadgeClass(selectedTicket.status)}`}>
                      {selectedTicket.status === 'REVIEW_NEEDED' ? 'AI Review Needed' : selectedTicket.status}
                    </span>
                  </div>
                </div>

                <div className="detail-scroll">
                  {/* Sender details */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
                    <div>
                      <span className="section-label">Submitted By</span>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{selectedTicket.customerName}</div>
                    </div>
                    <div>
                      <span className="section-label">Email Address</span>
                      <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>{selectedTicket.customerEmail}</div>
                    </div>
                  </div>

                  {/* Ticket message body */}
                  <div className="detail-section">
                    <span className="section-label">Customer Query</span>
                    <div className="message-box">{selectedTicket.body}</div>
                  </div>

                  {/* AI Summary Section */}
                  <div className="detail-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="section-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Sparkles size={12} style={{ color: 'var(--accent-primary)' }} />
                        AI Summary
                      </span>
                      {!selectedTicket.aiSummary && (
                        <button
                          className="btn btn-secondary"
                          style={{ width: 'auto', padding: '2px 8px', fontSize: '11px', borderRadius: '4px' }}
                          onClick={() => handleGenerateSummary(selectedTicket.id)}
                          disabled={generatingSummary}
                        >
                          {generatingSummary ? 'Summarizing...' : 'Generate'}
                        </button>
                      )}
                    </div>
                    {selectedTicket.aiSummary ? (
                      <div className="message-box ai-box" style={{ fontSize: '13px', borderLeft: '3px solid var(--accent-primary)' }}>
                        {selectedTicket.aiSummary}
                      </div>
                    ) : (
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px' }}>
                        No summary generated yet. Click generate.
                      </div>
                    )}
                  </div>

                  {/* AI Auto-Response Draft / Sent */}
                  <div className="detail-section">
                    <span className="section-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Sparkles size={12} style={{ color: 'var(--accent-primary)' }} />
                      AI Response Draft
                    </span>
                    {selectedTicket.aiResponse ? (
                      <div className="message-box ai-box" style={{ borderLeft: '3px solid var(--accent-primary)' }}>
                        <div className="ai-box-header">
                          <CheckCircle size={14} style={{ color: selectedTicket.aiAutoReplied ? 'var(--status-resolved)' : 'var(--accent-primary)' }} />
                          <span>{selectedTicket.aiAutoReplied ? 'Auto-Replied & Resolved' : 'Review Needed (Draft Reply)'}</span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{selectedTicket.aiResponse}</p>
                      </div>
                    ) : (
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px' }}>
                        No AI reply generated for this ticket.
                      </div>
                    )}
                  </div>

                  {/* Ticket Operations Panel */}
                  <div className="detail-section" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    <span className="section-label">Update Ticket Details</span>

                    <div className="detail-control-grid">
                      <div>
                        <label className="form-label">Status</label>
                        <select
                          className="filter-select"
                          style={{ width: '100%' }}
                          value={selectedTicket.status}
                          onChange={(e) => handleUpdateTicket(selectedTicket.id, { status: e.target.value })}
                          disabled={updatingTicketId === selectedTicket.id}
                        >
                          <option value="PENDING">Pending Review</option>
                          <option value="REVIEW_NEEDED">AI Review Needed</option>
                          <option value="RESOLVED">Resolved (Closed)</option>
                        </select>
                      </div>

                      <div>
                        <label className="form-label">Priority</label>
                        <select
                          className="filter-select"
                          style={{ width: '100%' }}
                          value={selectedTicket.priority}
                          onChange={(e) => handleUpdateTicket(selectedTicket.id, { priority: e.target.value })}
                          disabled={updatingTicketId === selectedTicket.id}
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="URGENT">Urgent</option>
                        </select>
                      </div>
                    </div>

                    {/* Agent Assignment Selection */}
                    <div style={{ marginTop: '12px' }}>
                      <label className="form-label">Assigned Agent</label>
                      <select
                        className="filter-select"
                        style={{ width: '100%' }}
                        value={selectedTicket.assignedToId || ''}
                        onChange={(e) => handleUpdateTicket(selectedTicket.id, { assignedToId: e.target.value || null })}
                        disabled={updatingTicketId === selectedTicket.id}
                      >
                        <option value="">Unassigned</option>
                        {user?.role === 'ADMIN' ? (
                          agents.map((agent) => (
                            <option key={agent.id} value={agent.id}>{agent.name} ({agent.email})</option>
                          ))
                        ) : (
                          // If current user is an agent, allow assigning to themselves or showing current assignee
                          <>
                            <option value={user.id}>Assign to me ({user.name})</option>
                            {selectedTicket.assignedTo && selectedTicket.assignedTo.id !== user.id && (
                              <option value={selectedTicket.assignedTo.id}>{selectedTicket.assignedTo.name}</option>
                            )}
                          </>
                        )}
                      </select>
                    </div>

                    {/* AI Actions */}
                    <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                      {user?.role === 'ADMIN' && (
                        <button
                          className="btn btn-secondary"
                          style={{ flex: 1, padding: '8px' }}
                          onClick={() => handleReprocessAI(selectedTicket.id)}
                          disabled={reprocessingAI}
                        >
                          {reprocessingAI ? 'Reprocessing...' : 'Gemini Reprocess'}
                        </button>
                      )}
                      {selectedTicket.status !== 'RESOLVED' && (
                        <button
                          className="btn btn-primary"
                          style={{ flex: 1, padding: '8px' }}
                          onClick={() => handleUpdateTicket(selectedTicket.id, { status: 'RESOLVED' })}
                          disabled={updatingTicketId === selectedTicket.id}
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Audit Logs / Timeline */}
                  <div className="detail-section" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    <span className="section-label">Audit Log Timeline</span>
                    <div className="timeline">
                      {selectedTicket.auditLogs?.map((log, index) => (
                        <div key={log.id} className="timeline-item completed" style={{ paddingLeft: '24px' }}>
                          <CheckCircle 
                            size={14} 
                            style={{ 
                              position: 'absolute', 
                              left: 0, 
                              top: '2px', 
                              color: 'var(--status-resolved)', 
                              backgroundColor: 'var(--bg-surface)',
                              borderRadius: '50%'
                            }} 
                          />
                          <span style={{ fontWeight: 600 }}>{log.action.replace(/_/g, ' ')}</span>
                          <span className="timeline-time">{formatDate(log.createdAt)}</span>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            by {log.performedBy}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <Ticket className="empty-state-icon" size={48} />
                <h3>No Ticket Selected</h3>
                <p style={{ marginTop: '4px' }}>Select a ticket from the dashboard list to view details, AI replies, and logs.</p>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Email Simulator Modal Overlay */}
      {showSimulator && (
        <div className="simulator-overlay">
          <div className="simulator-modal">
            <div className="simulator-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={18} style={{ color: 'var(--accent-primary)' }} />
                <span>Simulated Support Email Inbox</span>
              </h3>
              <button className="btn-icon" onClick={() => setShowSimulator(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSimulateEmail}>
              <div className="simulator-body">
                {/* Pre-fill templates buttons */}
                <div style={{ marginBottom: '20px' }}>
                  <span className="form-label">Load Query Template:</span>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => applySimTemplate('easy')}>
                      Low Priority (Auto-resolves)
                    </button>
                    <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => applySimTemplate('medium')}>
                      Medium Priority (Password)
                    </button>
                    <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => applySimTemplate('hard')}>
                      Urgent Priority (Billing/Human)
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label className="form-label">Student Name</label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Jane Doe"
                      value={simName}
                      onChange={(e) => setSimName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Student Email</label>
                    <input
                      className="form-input"
                      type="email"
                      placeholder="jane.doe@example.com"
                      value={simEmail}
                      onChange={(e) => setSimEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email Subject</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="E.g. Access problem after payment"
                    value={simSubject}
                    onChange={(e) => setSimSubject(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Email Body (Student Query)</label>
                  <textarea
                    className="form-input"
                    placeholder="Write details of the issue here..."
                    rows={6}
                    value={simBody}
                    onChange={(e) => setSimBody(e.target.value)}
                    style={{ resize: 'vertical', fontFamily: 'inherit' }}
                    required
                  />
                </div>
              </div>

              <div className="simulator-footer">
                <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setShowSimulator(false)}>
                  Close
                </button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }} disabled={submittingSimulator}>
                  {submittingSimulator ? 'Processing AI...' : 'Submit to Helpdesk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Overlay */}
      {confirmDialog.isOpen && (
        <div className="simulator-overlay" style={{ zIndex: 9999 }}>
          <div className="simulator-modal" style={{ maxWidth: '400px' }}>
            <div className="simulator-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--priority-high)' }}>
                <AlertCircle size={18} />
                <span>{confirmDialog.title}</span>
              </h3>
              <button className="btn-icon" onClick={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null })}>
                <X size={20} />
              </button>
            </div>
            
            <div className="simulator-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
                {confirmDialog.message}
              </p>
            </div>
            
            <div className="simulator-footer">
              <button 
                className="btn btn-secondary" 
                style={{ width: 'auto' }} 
                onClick={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null })}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                style={{ width: 'auto', backgroundColor: 'var(--priority-high)', borderColor: 'var(--priority-high)' }} 
                onClick={confirmDialog.onConfirm}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
