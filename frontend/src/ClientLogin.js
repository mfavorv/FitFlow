import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "./Auth.css"; // Use the new shared CSS

function ClientLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await axios.post("http://localhost:5000/client/login", { email, password });
      const token = res.data.access_token;
      localStorage.setItem("access_token", token);
      setMessage("Login successful!");
      navigate("/dashboard/client"); 
    } catch (err) {
      setMessage(err.response?.data?.message || "Incorrect username or password!");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <img
          src="https://cdn-icons-png.flaticon.com/128/149/149071.png"
          alt="Client Icon"
          className="auth-icon"
        />
        <h2>Client Login</h2>
        <p>Welcome back to FitFlow!</p>
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
          <Link to="/forgot-password">
            Reset here
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ClientLogin;
