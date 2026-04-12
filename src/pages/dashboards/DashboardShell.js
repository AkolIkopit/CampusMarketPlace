import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getRoleLabel } from "../../auth";
import { supabase } from "../../supabase";
import "./DashboardShell.css";

export default function DashboardShell({ theme, profile, title, subtitle, cards }) {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("resize", handleResize);
    };
  }, [isMenuOpen]);

  const handleSignOut = async () => {
    setIsMenuOpen(false);
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className={`dashboard-shell ${theme}`}>
      <header className="dashboard-topbar">
        <div className="dashboard-brand">
          <span className="dashboard-brand-mark">UM</span>
          <div>
            <p className="dashboard-brand-name">UniMart</p>
            <p className="dashboard-brand-sub">Marketplace workspace</p>
          </div>
        </div>

        <div className="dashboard-actions">
          <span className="dashboard-welcome">{profile.full_name}</span>
          <span className="dashboard-badge">{getRoleLabel(profile.role)}</span>
          <button className="dashboard-logout" onClick={handleSignOut}>
            Logout
          </button>
        </div>

        <button
          type="button"
          className={`dashboard-burger ${isMenuOpen ? "active" : ""}`}
          aria-label={isMenuOpen ? "Close dashboard menu" : "Open dashboard menu"}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      <div className={`dashboard-mobile-panel ${isMenuOpen ? "open" : ""}`}>
        <div className="dashboard-mobile-card">
          <p className="dashboard-mobile-name">{profile.full_name}</p>
          <span className="dashboard-badge">{getRoleLabel(profile.role)}</span>
          <button className="dashboard-logout dashboard-logout-full" onClick={handleSignOut}>
            Logout
          </button>
        </div>
      </div>

      <main className="dashboard-main">
        <section className="dashboard-hero">
          <span className="dashboard-kicker">{getRoleLabel(profile.role)} workspace</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </section>

        <section className="dashboard-grid">
          {cards.map((card) => (
            <article key={card.title} className="dashboard-card">
              <span className="dashboard-card-icon">{card.icon}</span>
              <h2>{card.title}</h2>
              <p>{card.description}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
