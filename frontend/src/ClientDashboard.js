import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './ClientDashboard.css';
import { useNavigate } from "react-router-dom";

const ClientDashboard = () => {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('access_token');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await axios.get('http://localhost:5000/dashboard/client', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setClient(res.data.client);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [token]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

return (
  <div className="dashboard">
    <main className="main-content">
      <header>
        <h1>👋 Welcome, {client.first_name}!</h1>
      </header>

      <div className="grid-container">
        {/* Account Info */}
        <div className="card">
          <img 
            className="card-image"
            src="https://plus.unsplash.com/premium_photo-1711987351245-6b048554813b?w=1000&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjF8fGh1bWFuJTIwaGVhZCUyMGFuaW1hdGlvbnxlbnwwfHwwfHx8MA%3D%3D" 
            alt="Gym client checking details" 
          />
          <div className="card-content">
            <h3>Account Info</h3>
            <p><strong>Email:</strong> {client.email}</p>
            <p><strong>Phone:</strong> {client.phone}</p>
            <p><strong>Joined:</strong> {new Date(client.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Subscription */}
        <div className="card">
          <img 
            className="card-image"
            src="https://images.unsplash.com/photo-1605296867304-46d5465a13f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
            alt="Membership subscription packages" 
          />
          <div className="card-content">
            <h3>Current Subscription</h3>
            <p><strong>Plan:</strong> {client.subscription || 'None'}</p>
            <p><strong>Price:</strong> {client.subscription_price ? `KES ${client.subscription_price}` : 'N/A'}</p>
            <p><strong>Expiry:</strong> {client.subscription_expiry ? new Date(client.subscription_expiry).toLocaleDateString() : 'N/A'}</p>
          </div>
        </div>

        {/* Payments */}
        <div className="card">
          <img 
            className="card-image"
            src="https://images.unsplash.com/photo-1649359569078-c445b3c6a116?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nzd8fHBheW1lbnR8ZW58MHx8MHx8fDA%3D" 
            alt="Gym payments and billing" 
          />
          <div className="card-content">
            <h3>Payments</h3>
            <p>💳 View past payments</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate("/payments")}
            >
              View Payments
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <img 
            className="card-image"
            src="https://images.unsplash.com/photo-1581085271555-d32ebe05933a?q=80&w=1032&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
            alt="Toolbox for quick actions" 
          />
          <div className="card-content">
            <h3>Quick Actions</h3>
            <button className="btn btn-secondary" onClick={() => navigate("/update")}>⚙️ Update Profile</button>
            <button className="btn btn-primary" onClick={() => navigate("/payment")}>🔄 Renew Subscription</button>
          </div>
        </div>
      </div>
    </main>
  </div>
);

};

export default ClientDashboard;