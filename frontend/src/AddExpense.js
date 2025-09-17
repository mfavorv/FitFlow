import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Add.css"; 

function AddExpense() {
  const [formData, setFormData] = useState({
    expense: "",
    cost: ""
  });
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.expense) newErrors.expense = "Expense description is required";
    if (!formData.cost) newErrors.cost = "Cost is required";
    // else if (isNaN(formData.cost) || parseFloat(formData.cost) <= 0) {
    //   newErrors.cost = "Please enter a valid positive number";
    // }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  if (!validateForm()) {
    setLoading(false);
    return;
  }

  try {
    const token = localStorage.getItem("access_token");  
    if (!token) {
      setMessage("Please login first");
      navigate("/admin/login");
      return;
    }

    const response = await axios.post(
      "http://localhost:5000/addExpense",
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`, // ✅ send correct token
          "Content-Type": "application/json"
        }
      }
    );

    setMessage(response.data.message);
    setFormData({ expense: "", cost: "" }); // clear form
  } catch (error) {
    if (error.response) {
      if (error.response.status === 401) {
        localStorage.removeItem("token"); // clear expired token
        setMessage("Session expired. Please login again.");
        navigate("/admin/login");
      } else {
        setMessage(error.response.data.error || "An error occurred");
      }
    } else {
      setMessage("Network error. Please try again.");
    }
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="container">
      <h2>Add Expense</h2>
      <form onSubmit={handleSubmit}>
        <input
          name="expense"
          type="text"
          placeholder="Expense Description"
          value={formData.expense}
          onChange={handleChange}
          className="input-field"
          required
        />
        {errors.expense && <p className="message-error">{errors.expense}</p>}
        
        <input
          name="cost"
          type="number"
          placeholder="Cost (KES)"
          value={formData.cost}
          onChange={handleChange}
          className="input-field"
          min="0"
          step="any"
          required
        />
        {errors.cost && <p className="message-error">{errors.cost}</p>}
        
        <div className="button-group">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate("/dashboard/admin")}
          >
            Back to Dashboard
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? "Processing..." : "Add Expense"}
          </button>
        </div>
      </form>
      {message && <p className={message.toLowerCase().includes("error") || message.toLowerCase().includes("fail") ? "message-error" : "message-success"}>{message}</p>}
    </div>
  );
}

export default AddExpense;
