import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUserPlus,
  FaMoneyBill,
  FaCashRegister,
  FaUsers,
  FaReceipt,
  FaUserCog,
} from "react-icons/fa";
import { FiMoreVertical } from "react-icons/fi"; // three dots icon
import "./AdminDashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    clients: 0,
    expenses: 0,
    payments: 0,
  });

  const [subscriptions, setSubscriptions] = useState([]); // store subscription list
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Fetch main dashboard stats
useEffect(() => {
  const token = localStorage.getItem("token"); // or sessionStorage if that’s where you store it
  fetch("http://127.0.0.1:5000/dashboard", {
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  })
    .then((res) => {
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    })
    .then((data) => setStats(data))
    .catch((err) => console.error("Error fetching dashboard stats:", err));
}, []);

  // Fetch subscriptions list
  useEffect(() => {
    fetch("http://127.0.0.1:5000/subscriptions")
      .then((res) => res.json())
      .then((data) => setSubscriptions(data))
      .catch((err) => console.error("Error fetching subscriptions:", err));
  }, []);

  const actions = [
    { label: "Add Client", icon: <FaUserPlus />, route: "/addClient" },
    { label: "Add Expense", icon: <FaMoneyBill />, route: "/addExpense" },
    { label: "Mark Cash Payment", icon: <FaCashRegister />, route: "/markCashPayment" },
    { label: "Client List", icon: <FaUsers />, route: "/clients" },
    { label: "Expenses", icon: <FaReceipt />, route: "/expenses" },
    { label: "Update Profile", icon: <FaUserCog />, route: "/admin/update" },
  ];

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-card-bg">
        {/* Header with actions button */}
        <div className="dashboard-header">
          <h1 className="dashboard-title">Admin Dashboard</h1>
          <div className="actions-menu">
            <button
              className="actions-toggle"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <FiMoreVertical size={22} />
            </button>
            {dropdownOpen && (
              <ul className="actions-dropdown">
                {actions.map((action, idx) => (
                  <li
                    key={idx}
                    className="dropdown-item"
                    onClick={() => navigate(action.route)}
                  >
                    <span className="dropdown-icon">{action.icon}</span>
                    <span>{action.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Admin details */}
        <div className="admin-details">
          <h2>Welcome Back</h2>
        </div>

        {/* Stats Section */}
        <div className="stats-container">
          <div className="stat-box">
            <h3>Total Clients</h3>
            <div className="stat-amount">{stats.clients}</div>
          </div>
          <div className="stat-box">
            <h3>Expenses</h3>
            <div className="stat-amount">{stats.expenses}</div>
          </div>
          <div className="stat-box">
            <h3>Payments</h3>
            <div className="stat-amount">{stats.payments}</div>
          </div>
        </div>

        {/* Subscriptions Section */}
        <div className="subscriptions-section">
          <h2>Subscriptions</h2>
          {subscriptions.length > 0 ? (
            <ul className="subscription-list">
              {subscriptions.map((sub) => (
                <li key={sub.id} className="subscription-item">
                  <div className="sub-name">{sub.name}</div>
                  <div className="sub-price">${sub.price}</div>
                  <div className="sub-duration">{sub.duration_days} days</div>
                </li>
              ))}
            </ul>
          ) : (
            <p>No subscriptions found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
