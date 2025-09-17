import { useNavigate } from "react-router-dom";

export default function AdminNav() {
  const navigate = useNavigate();

  return (
    <nav style={styles.navbar}>
      <button style={styles.navButton} onClick={() => navigate("/admin/create")}>
        Add Admin
      </button>
      <button style={styles.navButton} onClick={() => navigate("/admin/login")}>
        Login
      </button>
    </nav>
  );
}

const styles = {
  navbar: {
    display: "flex",
    justifyContent: "center",
    gap: "1rem",
    padding: "1rem 2rem",
    backgroundColor: "#ffffff", // clean white
    borderBottom: "2px solid #4CAF50", // tie into accent color
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
  },
  navButton: {
    padding: "0.6rem 1.2rem",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#4CAF50", // accent color
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
};
