import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Update.css";

const ClientUpdate = () => {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("access_token");
  const navigate  = useNavigate();

  // Fetch current client details
  useEffect(() => {
    const fetchClient = async () => {
      try {
        const res = await axios.get("http://localhost:5000/dashboard/client", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setClient(res.data.client);
      } catch (err) {
        console.error("Failed to fetch client details", err);
      }
    };
    fetchClient();
  }, [token]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!client) return;

    setLoading(true);
    setMessage("");

    try {
      const res = await axios.put(
        `http://localhost:5000/update`,
        {
          first_name: client.first_name,
          last_name: client.last_name,
          email: client.email,
          phone: client.phone,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage(res.data.message || "Profile updated successfully.");
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  if (!client) return <p>Loading client info...</p>;

  return (
    <div className="update-container">
      <h2>Update Your Details</h2>

      <form onSubmit={handleUpdate} className="update-form">
        <label>
          First Name:
          <input
            type="text"
            value={client.first_name}
            className="input-field"
            onChange={(e) =>
              setClient({ ...client, first_name: e.target.value })
            }
          />
        </label>

        <label>
          Last Name:
          <input
            type="text"
            value={client.last_name}
            className="input-field"
            onChange={(e) =>
              setClient({ ...client, last_name: e.target.value })
            }
          />
        </label>

        <label>
          Email:
          <input
            type="email"
            value={client.email}
            className="input-field"
            onChange={(e) => setClient({ ...client, email: e.target.value })}
          />
        </label>

        <label>
          Phone:
          <input
            type="tel"
            value={client.phone}
            className="input-field"
            onChange={(e) => setClient({ ...client, phone: e.target.value })}
          />
        </label>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Updating..." : "Update Profile"}
        </button>

        <button type="button"
        className="btn btn-secondary"
        onClick={() => navigate('/dashboard/client')}>
          Back to Dashboard
        </button>
      </form>

      {message && <p className={message.toLowerCase().includes("fail") ? "message-error" : "message-success"}>{message}</p>}
    </div>
  );
};

export default ClientUpdate;
