import React, { useEffect, useState } from "react";
import "./List.css";
import { useNavigate } from "react-router-dom";

function PaymentsList() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch("http://127.0.0.1:5000/client/payments", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setPayments(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching payments:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="payments-container"><p>Loading payments...</p></div>;
  }

  return (
    <div className="payments-container">
      <h2>Payments</h2>
      {payments.length === 0 ? (
        <p className="no-payments">No payments have been made yet.</p>
      ) : (
        <table className="payments-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Client</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.client_id}</td>
                <td>KES {p.amount}</td>
                <td>{p.date}</td>
                <td>
                  <span
                    className={`status ${
                      p.status === "Success"
                        ? "success"
                        : p.status === "Pending"
                        ? "pending"
                        : "failed"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button type="button" 
        className="btn btn-secondary"
        onClick={() => navigate('/dashboard/client')}>
          Back to Dashboard
      </button>
    </div>
  );
}

export default PaymentsList;
