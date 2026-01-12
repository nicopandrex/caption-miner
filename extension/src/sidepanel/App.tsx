import { useState, useEffect } from "react";
import Auth from "./pages/Auth";
import StudySession from "./pages/StudySession";
import CardsList from "./pages/CardsList";
import AnkiExport from "./pages/AnkiExport";
import { getAuthToken } from "../lib/api";

type Page = "session" | "cards" | "anki";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>("session");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const token = getAuthToken();
    setIsAuthenticated(!!token);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="container">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth onAuth={() => setIsAuthenticated(true)} />;
  }

  return (
    <div>
      <nav className="nav">
        <button
          className={`nav-button ${currentPage === "session" ? "active" : ""}`}
          onClick={() => setCurrentPage("session")}
        >
          Session
        </button>
        <button
          className={`nav-button ${currentPage === "cards" ? "active" : ""}`}
          onClick={() => setCurrentPage("cards")}
        >
          Cards
        </button>
        <button
          className={`nav-button ${currentPage === "anki" ? "active" : ""}`}
          onClick={() => setCurrentPage("anki")}
        >
          Anki
        </button>
      </nav>

      <div>
        {currentPage === "session" && <StudySession />}
        {currentPage === "cards" && <CardsList />}
        {currentPage === "anki" && <AnkiExport />}
      </div>
    </div>
  );
}
