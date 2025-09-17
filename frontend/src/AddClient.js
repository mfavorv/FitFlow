import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./AddClient.css";

function AddClient() {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    status: "Active",
    subscription: ""
  });
  const [subscriptions, setSubscriptions] = useState([]);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("access_token");
        const response = await axios.get("http://localhost:5000/subscriptions", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSubscriptions(response.data);
      } catch (error) {
        console.error("Error fetching subscriptions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.first_name) newErrors.first_name = "First name is required";
    if (!formData.last_name) newErrors.last_name = "Last name is required";
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.phone) newErrors.phone = "Phone is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      setMessage("Please fix the errors in the form");
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setMessage("Please login first");
        return;
      }

      const response = await axios.post(
        "http://localhost:5000/addClient",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      setMessage(response.data.message);
    } catch (error) {
      if (error.response) {
        if (error.response.status === 401) {
          setMessage("Session expired. Please login again.");
          navigate("/admin/login");
        } else {
          setMessage(error.response.data.error || "An error occurred");
        }
      } else {
        setMessage("Network error. Please try again.");
      }
    }
  };

  return (
    <div className="page-wrapper add-client-wrapper">
      <div className="page-card">
        <h2>Add Client</h2>
        <form onSubmit={handleSubmit}>
          <input
            name="first_name"
            type="text"
            placeholder="First Name"
            value={formData.first_name}
            onChange={handleChange}
            className="input-field"
            required
          />
          {errors.first_name && <p className="message-error">{errors.first_name}</p>}

          <input
            name="last_name"
            type="text"
            placeholder="Last Name"
            value={formData.last_name}
            onChange={handleChange}
            className="input-field"
            required
          />
          {errors.last_name && <p className="message-error">{errors.last_name}</p>}

          <input
            name="phone"
            type="tel"
            placeholder="Phone Number"
            value={formData.phone}
            onChange={handleChange}
            className="input-field"
            required
          />
          {errors.phone && <p className="message-error">{errors.phone}</p>}

          <input
            name="email"
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="input-field"
            required
          />
          {errors.email && <p className="message-error">{errors.email}</p>}

          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="input-field"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Pending">Pending</option>
          </select>

          {isLoading ? (
            <p>Loading subscriptions...</p>
          ) : (
            <select
              name="subscription"
              value={formData.subscription}
              onChange={handleChange}
              className="input-field"
            >
              <option value="">No Subscription</option>
              {subscriptions.map((sub) => (
                <option key={sub.id} value={sub.name}>
                  {sub.name}
                </option>
              ))}
            </select>
          )}

          <div className="button-group">
            <button type="submit" className="btn btn-primary">
              Add Client
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate("/dashboard/admin")}
            >
              Back to Dashboard
            </button>
          </div>
        </form>
        {message && (
          <p
            className={
              message.toLowerCase().includes("error") || message.toLowerCase().includes("fail") ? "message-error" : "message-success"
            }
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export default AddClient;
