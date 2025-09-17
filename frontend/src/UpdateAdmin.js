import React, { useState } from "react";
import axios from "axios";

function UpdateAdmin() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleUpdate = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.put(
        "http://localhost:5000/admin/update",
        { email, name, password },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(res.data.message);
    } catch (err) {
      setMessage(err.response?.data?.message || "Update failed!");
    }
  };

  return (
    <div className="container">
      <h2>Update Profile</h2>
      <input
        type="text"
        placeholder="New Name"
        value={name}
        className="input-field"
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="email"
        placeholder="New Email"
        value={email}
        className="input-field"
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="New Password"
        value={password}
        className="input-field"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleUpdate} className="btn btn-primary">Update</button>
      {message && <p className={message.includes("success") ? "message-success" : "message-error"}>{message}</p>}
    </div>
  );
}

export default UpdateAdmin;
