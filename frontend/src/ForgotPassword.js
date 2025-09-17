import React, { useState } from "react";
import axios from "axios";
import "./Auth.css"; // Use the new shared CSS

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    try {
      const res = await axios.post("http://localhost:5000/forgot-password", {
        email,
      });
      setMessage(res.data.message);
    } catch (err) {
      setMessage(err.response?.data?.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Reset Your Password</h2>
        <p>Enter your email and we’ll send you a reset link.</p>
        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
        />
        <button className="btn btn-primary" onClick={handleSubmit}>Send Reset Link</button>
        {message && <p className={message.includes("sent") ? "message-success" : "message-error"}>{message}</p>}
      </div>
    </div>
  );
}

export default ForgotPassword;
