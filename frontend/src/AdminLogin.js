import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "./Auth.css";

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await axios.post("http://localhost:5000/admin/login", { email, password });
      const token = res.data.token;
      localStorage.setItem("access_token", token);
      setMessage("Login successful!");
      navigate("/dashboard/admin");
    } catch (err) {
      setMessage(err.response?.data?.message || "Login failed! Please check your credentials.");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <img
          src="https://cdn-icons-png.flaticon.com/128/3033/3033143.png" // Using a more distinct admin icon
          alt="Admin Icon"
          className="auth-icon"
        />
        <h2>Admin Login</h2>
        <p>Access the management dashboard.</p>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-field"
        />
        <button onClick={handleLogin} className="btn btn-primary">Login</button>
        {message && <p className={message.includes("success") ? "message-success" : "message-error"}>{message}</p>}

        <div className="extra-link">
          <span>Forgot your password? </span>
          <Link to="/forgot-password">Reset here</Link>
        </div>

        <div className="extra-link">
          <span>Need an account? </span>
          <Link to="/admin/create">Create Admin</Link>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
