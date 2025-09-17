import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./shared.css"; // Import shared styles
import ClientLogin from "./ClientLogin";
import ClientDashboard from "./ClientDashboard";
import AdminDashboard from "./AdminDashboard";
import Home from "./Home";
import AdminLogin from "./AdminLogin";
import AddClient from "./AddClient";
import AddExpense from "./AddExpense";
import ExpenseList from "./AllExpenses";
import ProtectedRoute from './ProtectedRoutes';
import ClientsList from "./ViewClients";
import PaymentLoggingForm from "./MarkCashPayment";
import MpesaPayment from "./Payment";
import ClientUpdate from "./UpdateProfile";
import PaymentsList from "./PaymentList";
import AddAdmin from "./AddAdmin";
import AdminUpdate from "./UpdateAdmin"; // create this component
import ForgotPassword from "./ForgotPassword";


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/client/login" element={<ClientLogin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected routes */}
        <Route path="/dashboard/admin" element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/addClient" element={
          <ProtectedRoute>
            <AddClient />
          </ProtectedRoute>
        } />

        <Route path="/dashboard/client" element={
          <ProtectedRoute>
            <ClientDashboard />
          </ProtectedRoute>
        } />
        <Route path="/addExpense" element={
          <ProtectedRoute>
            <AddExpense />
          </ProtectedRoute>
        } />
        <Route path="/expenses"  element={
          <ProtectedRoute>
            <ExpenseList />
          </ProtectedRoute>
        } />
        <Route path="/clients"  element={
          <ProtectedRoute>
            <ClientsList />
          </ProtectedRoute>
        } />
        <Route path="/markCashPayment"  element={
          <ProtectedRoute>
            <PaymentLoggingForm />
          </ProtectedRoute>
        } />
        <Route path="/payment"  element={
          <ProtectedRoute>
            <MpesaPayment />
          </ProtectedRoute>
        } />
        <Route path="/update"  element={
          <ProtectedRoute>
            <ClientUpdate />
          </ProtectedRoute>
        } />
        <Route path="/payments"  element={
          <ProtectedRoute>
            <PaymentsList />
          </ProtectedRoute>
        } />
        <Route path="/admin/create" element={
          <ProtectedRoute>
            <AddAdmin />
          </ProtectedRoute>
        } />
        <Route path="/admin/update" element={
          <ProtectedRoute>
            <AdminUpdate />
          </ProtectedRoute>
        } />


      </Routes>
    </Router>
  );
}

export default App;
