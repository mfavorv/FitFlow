import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Payment.css";
import { useNavigate } from "react-router-dom";

const MpesaPayment = () => {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const Popup = ({ message, onClose }) => {
    if (!message) return null;

    return (
      <div className="popup-overlay">
        <div className="popup-box">
          <p>{message}</p>
          <button onClick={onClose}>OK</button>
        </div>
      </div>
    );
  };

  const token = localStorage.getItem("access_token");

  // Fetch available plans from backend
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await axios.get("http://localhost:5000/subscriptions", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPlans(res.data);
      } catch (err) {
        console.error("Failed to fetch plans", err);
      }
    };
    fetchPlans();
  }, [token]);

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!selectedPlan || !phone) {
      setMessage("Please select a plan and enter your phone number.");
      return;
    }


    setLoading(true);
    setMessage("");

    try {
      const res = await axios.post(
        "http://localhost:5000/start/payment",
        {
          plan_name: selectedPlan,
          phone_number: phone,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage(res.data.message || "STK push sent. Check your phone.");
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to initiate payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mpesa-container">
      <h2>M-PESA Subscription Payment</h2>

      <form onSubmit={handlePayment} className="mpesa-form">
        <label>
          Select Plan:
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            className="input-field"
          >
            <option value="">-- Choose a plan --</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.name}>
                {plan.name} - KES {plan.price}
              </option>
            ))}
          </select>
        </label>

        <label>
          Phone Number (2547XXXXXXXX):
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-field"
            placeholder="2547XXXXXXXX"
          />
        </label>

        <label>
          Email:
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
          />
        </label>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Processing..." : "Pay with M-PESA"}
        </button>

        <button type="button" 
        className="btn btn-secondary"
        onClick={() => navigate('/dashboard/client')}>
          Back to Dashboard
        </button>
      </form>

    {message && <Popup message={message} onClose={() => setMessage("")} />}
    </div>
  );
};

export default MpesaPayment;
