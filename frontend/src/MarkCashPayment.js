import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './MarkCash.css';

const PaymentLoggingForm = () => {
  const [formData, setFormData] = useState({
    phone: '',
    subscription: '',
    payment_status: 'success',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
  });

  const [clients, setClients] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('access_token');

        const [clientsRes, subsRes] = await Promise.all([
          axios.get('/clients', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/subscriptions', { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        setClients(clientsRes.data?.clients || []);
        setSubscriptions(Array.isArray(subsRes.data) ? subsRes.data : []);
      } catch (error) {
        console.error('Error fetching data:', error);
        setMessage('Failed to load clients or subscriptions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setErrors({});

    try {
      const token = localStorage.getItem('access_token');
      const payload = {
        phone: formData.phone,
        subscription: formData.subscription,
        payment_status: formData.payment_status,
        amount: formData.amount ? Number(formData.amount) : null,
        payment_date: formData.payment_date,
      };

      const { data } = await axios.post('/markCashPayment', payload, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      setMessage(
        [
          `Payment processed for: ${data.client}`,
          `Plan: ${data.subscription}`,
          `Status: ${data.payment_status}`,
          data.new_expiry ? `New expiry: ${data.new_expiry}` : null,
          data.note ? data.note : null,
        ].filter(Boolean).join('\n')
      );
    } catch (error) {
      console.error('Payment logging failed:', error);
      setMessage(
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Payment logging failed'
      );
      if (error.response?.data?.errors) setErrors(error.response.data.errors);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="payment-logging-container">
      {/* Back to Dashboard */}
      <button className="btn btn-secondary" onClick={() => navigate('/admin/dashboard')}>
        ← Back to Dashboard
      </button>

      <h2>Record Manual Payment</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Client Phone:</label>
          <input
            list="client-phones"
            name="phone"
            value={formData.phone}
            className="input-field"
            onChange={handleChange}
            required
          />
          <datalist id="client-phones">
            {clients.map(c => (
              <option key={c.id} value={c.phone}>
                {c.first_name} {c.last_name}
              </option>
            ))}
          </datalist>
          {errors.phone && <span className="message-error">{errors.phone}</span>}
        </div>

        <div className="form-group">
          <label>Subscription Plan:</label>
          <select
            name="subscription"
            value={formData.subscription}
            onChange={handleChange}
            className="input-field"
            required
          >
            <option value="">Select a plan</option>
            {subscriptions.map(sub => (
              <option key={sub.id} value={sub.name}>
                {sub.name} ({sub.duration_days} days) — KES {sub.price}
              </option>
            ))}
          </select>
          {errors.subscription && <span className="message-error">{errors.subscription}</span>}
        </div>

        <div className="form-group">
          <label>Payment Status:</label>
          <select
            name="payment_status"
            value={formData.payment_status}
            onChange={handleChange}
            className="input-field"
            required
          >
            <option value="success">success</option>
            <option value="pending">pending</option>
            <option value="failed">failed</option>
          </select>
        </div>

        <div className="form-group">
          <label>Amount Paid:</label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            className="input-field"
            placeholder="Leave empty to use plan price"
            min="0"
            step="1000"
          />
        </div>

        <div className="form-group">
          <label>Payment Date:</label>
          <input
            type="date"
            name="payment_date"
            value={formData.payment_date}
            onChange={handleChange}
            className="input-field"
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? 'Processing…' : 'Record Payment'}
        </button>

        <button
          type="button"
          onClick={() => navigate('/admin/clients')}
          className="btn btn-secondary"
        >
          Cancel
        </button>
      </form>

      {message && (
        <div className={`message ${message.toLowerCase().includes('fail') ? 'error' : 'success'}`}>
          {message.split('\n').map((line, i) => <p key={i} className={message.toLowerCase().includes('fail') ? 'message-error' : 'message-success'}>{line}</p>)}
        </div>
      )}
    </div>
  );
};

export default PaymentLoggingForm;
