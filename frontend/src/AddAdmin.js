import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "./Auth.css"; // Import the shared CSS

function AddAdmin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission
    try {
      await axios.post("http://localhost:5000/add/admin", { email, password });
      setMessage("Admin created successfully! Redirecting to login...");
      setTimeout(() => navigate("/admin/login"), 2000);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to create admin.");
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-card">
        <img
          src="https://cdn-icons-png.flaticon.com/128/942/942748.png" // Icon for adding a user
          alt="Add Admin"
          className="auth-icon"
        />
        <h2>Create New Admin</h2>
        <p>Set up a new administrator account for FitFlow.</p>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-field"
          required
        />
        <button type="submit" className="btn btn-primary">
          Create Admin
        </button>
        {message && <p className={message.includes("success") ? "message-success" : "message-error"}>{message}</p>}

        <div className="extra-link">
          <span>Already have an account? </span>
          <Link to="/admin/login">Login here</Link>
        </div>
      </form>
    </div>
  );
}

export default AddAdmin;