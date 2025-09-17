import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./App.css";

function ExpenseList() {
  const [expenses, setExpenses] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    month: "",
    year: new Date().getFullYear()
  });
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

useEffect(() => {
  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = {};
      if (filters.month) params.month = filters.month;
      if (filters.year) params.year = filters.year;

      const res = await axios.get("http://localhost:5000/expenses", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params
      });

      setExpenses(res.data.expenses);
      setTotal(res.data.total);
      setMessage("");
    } catch (err) {
      if (err.response?.status === 401) {
        setMessage("Login first to access expenses.");
      } else {
        setMessage(err.response?.data?.error || "Failed to fetch expenses");
      }
      setExpenses([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  fetchExpenses();
}, [filters.month, filters.year]);


  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const months = [
    { value: "", label: "All Months" },
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" }

  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="container">
      <h2>Expense Report</h2>
      
      <div className="filters">
        <select 
          name="month" 
          value={filters.month}
          onChange={handleFilterChange}
          className="input-field"
        >
          {months.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        
        <select
          name="year"
          value={filters.year}
          onChange={handleFilterChange}
          className="input-field"
        >
          {years.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        
      <button className="btn btn-secondary" onClick={() => navigate("/dashboard/admin")}>
        Back to Dashboard
      </button>
      </div>

      {message && <p className="message-error">{message}</p>}
      
      {loading ? (
        <p>Loading expenses...</p>
      ) : (
        <>
          <div className="summary">
            <p>Total Expenses: <strong>KES {total.toLocaleString()}</strong></p>
            <p>Number of Expenses: <strong>{expenses.length}</strong></p>
            {filters.month && (
              <p>Month: <strong>{months.find(m => m.value === filters.month)?.label} {filters.year}</strong></p>
            )}
          </div>
          
          <table className="expense-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Cost (KES)</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length > 0 ? (
                expenses.map((exp) => (
                  <tr key={exp.id}>
                    <td>{exp.expense}</td>
                    <td>{exp.cost.toLocaleString()}</td>
                    <td>{new Date(exp.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5">No expenses found</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export default ExpenseList;