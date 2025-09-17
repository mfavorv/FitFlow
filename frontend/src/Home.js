import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

const images = [
  "https://images.unsplash.com/photo-1728486145245-d4cb0c9c3470?w=1000&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Z3ltJTIwYmFja2dyb3VuZHxlbnwwfHwwfHx8MA%3D%3D",
  "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGZpdG5lc3N8ZW58MHx8MHx8fDA%3D",
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fGZpdG5lc3N8ZW58MHx8MHx8fDA%3D",
];

function Home() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 3000); // switch every 3 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="home-container">
      {/* Background slideshow */}
      {images.map((img, index) => (
        <div
          key={index}
          className={`bg-slide ${index === current ? "active" : ""}`}
          style={{ backgroundImage: `url(${img})` }}
        ></div>
      ))}

      {/* Glassmorphism overlay for entire page */}
      <div className="glass-overlay">
        <div className="overlay-content">
          <h1 className="home-header">Welcome to FitFlow</h1>
          <p className="home-subtext">Select your role to continue</p>

          <div className="role-buttons">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate("/client/login")}
            >
              I am a Client
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate("/admin/login")}
            >
              I am an Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
