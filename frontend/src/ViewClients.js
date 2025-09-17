import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ClientsList.css';

const ClientsList = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [clientsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    subscription_id: ""
  });

  const navigate = useNavigate();

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          navigate('/admin/login');
          return;
        }

        const params = {
          search: searchTerm,
          status: statusFilter !== 'all' ? statusFilter : undefined
        };

        const response = await axios.get('http://localhost:5000/clients', {
          headers: { Authorization: `Bearer ${token}` },
          params
        });

        setClients(response.data.clients || []);
        setCurrentPage(1);
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem('access_token');
          navigate('/admin/login');
        }
        setError(err.response?.data?.error || 'Failed to fetch clients');
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchClients, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, statusFilter, navigate]);

  const filteredClients = clients.filter(client =>
    (client.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.includes(searchTerm))
  );

  const startEditing = (client) => {
    setEditingClient(client.id);
    setFormData({
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
      phone: client.phone,
      subscription_id: client.subscription_id || ''
    });
  };

  const handleUpdateClient = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.patch(
        `http://localhost:5000/clients/${editingClient}`,
        {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          subscription_id: formData.subscription_id
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setClients((prev) =>
        prev.map((c) =>
          c.id === editingClient ? response.data.client : c
        )
      );

      setEditingClient(null);
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        subscription_id: ""
      });
    } catch (err) {
      setActionMessage(err.response?.data?.message || "Failed to update client");
    }
  };

  const handleDeleteClient = async (clientId) => {
    if (!window.confirm("Are you sure you want to delete this client? This action cannot be undone.")) return;
    setActionMessage('');

    try {
      const token = localStorage.getItem("access_token");
      await axios.delete(`http://localhost:5000/clients/${clientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClients(prev => prev.filter(client => client.id !== clientId));
    } catch (err) {
      setActionMessage(err.response?.data?.error || "Failed to delete client");
    }
  };

  // Pagination
  const indexOfLastClient = currentPage * clientsPerPage;
  const indexOfFirstClient = indexOfLastClient - clientsPerPage;
  const currentClients = filteredClients.slice(indexOfFirstClient, indexOfLastClient);
  const totalPages = Math.ceil(filteredClients.length / clientsPerPage);

  if (loading) return <div className="loading">Loading clients...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="clients-container">
      <div className="clients-header">
        <h2>Client Management</h2>
        {actionMessage && <p className={actionMessage.toLowerCase().includes('fail') ? 'message-error' : 'message-success'}>{actionMessage}</p>}
        <div className="filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search clients..."
              className="input-field"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      <div className="clients-table-container">
        <form onSubmit={handleUpdateClient}>
          <table className="clients-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Subscription</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentClients.length > 0 ? (
                currentClients.map((client) =>
                  editingClient === client.id ? (
                    // Edit Row
                    <tr key={client.id}>
                      <td>
                        <input type="text" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} className="input-field" />
                        <input type="text" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} className="input-field" />
                      </td>
                      <td><input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="input-field" /></td>
                      <td><input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="input-field" /></td>
                      <td><input type="text" value={formData.subscription_id} onChange={(e) => setFormData({...formData, subscription_id: e.target.value})} className="input-field" placeholder="Sub ID" /></td>
                      <td><span className={`status-badge ${client.status?.toLowerCase()}`}>{client.status || 'Active'}</span></td>
                      <td className="actions">
                        <button type="submit" className="btn btn-primary">💾 Save</button>
                        <button type="button" className="btn btn-secondary" onClick={() => setEditingClient(null)}>✖ Cancel</button>
                      </td>
                    </tr>
                  ) : (
                    // View Row
                    <tr key={client.id}>
                      <td>{client.first_name} {client.last_name}</td>
                      <td>{client.email}</td>
                      <td>{client.phone}</td>
                      <td>
                        {client.subscription || 'None'}
                        {client.subscription_expiry && (
                          <span className="expiry-date"> (Expires: {new Date(client.subscription_expiry).toLocaleDateString()})</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge ${client.status?.toLowerCase()}`}>
                          {client.status || 'Active'}
                        </span>
                      </td>
                      <td className="actions">
                        <button type="button" className="btn btn-secondary" onClick={() => startEditing(client)}>✏️ Edit</button>
                        <button type="button" className="btn btn-danger" onClick={() => handleDeleteClient(client.id)}>🗑️ Delete</button>
                      </td>
                    </tr>
                  )
                )
              ) : (
                <tr>
                  <td colSpan="6" className="no-clients">
                    No clients found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </form>
      </div>


      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button className="btn" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ClientsList;
