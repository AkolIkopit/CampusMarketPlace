import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

const categories = [
  { icon: "📚", label: "Textbooks" },
  { icon: "💻", label: "Electronics" },
  { icon: "🛋️", label: "Furniture" },
  { icon: "👕", label: "Clothing" },
  { icon: "🎮", label: "Gaming" },
  { icon: "🚲", label: "Transport" },
  { icon: "🎨", label: "Art & Craft" }
];

const marqueeItems = [
  "TEXTBOOKS", "ELECTRONICS", "FURNITURE", "CLOTHING", "GAMING",
  "TRANSPORT", "ART", "SPORTS", "MUSIC",
  "TEXTBOOKS", "ELECTRONICS", "FURNITURE", "CLOTHING", "GAMING",
  "TRANSPORT", "ART", "SPORTS", "MUSIC",
];

const stats = [
  { value: "2,400+", label: "Active listings" },
  { value: "8,100+", label: "Students registered" },
  { value: "1,200+", label: "Items sold" },
];

const howItWorks = [
  {
    step: "01",
    title: "List your item",
    body: "Snap a photo, set a price, and choose sale or trade. Takes under 2 minutes.",
  },
  {
    step: "02",
    title: "Chat and negotiate",
    body: "Use in-app messaging to chat with buyers and lock in a deal on your terms.",
  },
  {
    step: "03",
    title: "Meet at the trade hub",
    body: "Book a safe drop-off slot at your campus trade facility. No dodgy meetups.",
  },
  {
    step: "04",
    title: "Get paid",
    body: "Online payment with zero cash stress. Any shortfall is tracked automatically.",
  },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleResize = () => {
      if (window.innerWidth > 900) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("resize", handleResize);
    };
  }, [isMenuOpen]);

  const openAuth = (mode) => {
    setIsMenuOpen(false);
    navigate(`/auth?mode=${mode}`);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <main className="landing">
      <nav className="nav anim-fade-in">
        <div className="nav-logo">
          <span className="nav-logo-mark"><img src="/UniMartlogo.png" alt="UniMart logo" /></span>
          <span className="nav-logo-text">UniMart</span>
        </div>

        <nav className="nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#categories">Browse</a>
          <button className="btn-nav-ghost" onClick={() => openAuth("login")}>
            Log in
          </button>
          <button className="btn-nav-primary" onClick={() => openAuth("signup")}>
            Sign up free
          </button>
        </nav>

        <button
          type="button"
          className={`nav-burger ${isMenuOpen ? "active" : ""}`}
          aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      <aside className={`mobile-menu ${isMenuOpen ? "open" : ""}`}>
        <nav className="mobile-menu-panel">
          <a href="#how-it-works" onClick={closeMenu}>
            How it works
          </a>
          <a href="#categories" onClick={closeMenu}>
            Browse
          </a>
          <button className="btn-nav-ghost mobile-menu-btn" onClick={() => openAuth("login")}>
            Log in
          </button>
          <button className="btn-nav-primary mobile-menu-btn" onClick={() => openAuth("signup")}>
            Sign up free
          </button>
        </nav>
      </aside>

      <header className="hero">
        <div className="hero-bg-grid" aria-hidden="true" />
        <div className="hero-blob hero-blob-1" aria-hidden="true" />
        <div className="hero-blob hero-blob-2" aria-hidden="true" />

        <div className="hero-content">
          <div className="hero-badge anim-fade-up anim-delay-1">
            <span className="hero-badge-dot" />
            Trusted by Wits students
          </div>

          <h1 className="hero-headline anim-fade-up anim-delay-2">
            Buy, sell and
            <br />
            <em>trade</em> on campus
            <br />
            safely.
          </h1>

          <p className="hero-sub anim-fade-up anim-delay-3">
            The student-only marketplace built for your campus. From second-hand textbooks
            to last semester&apos;s laptop, find it here.
          </p>

          <div className="hero-stats anim-fade-up anim-delay-5">
            {stats.map((stat) => (
              <div key={stat.label} className="hero-stat">
                <span className="hero-stat-value">{stat.value}</span>
                <span className="hero-stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-visual anim-fade-in anim-delay-3" aria-hidden="true">
          <div className="listing-card card-float-1">
            <div className="lc-img" style={{ background: "linear-gradient(135deg,#c9d6ff,#e2e2e2)" }}>
              📚
            </div>
            <div className="lc-body">
              <p className="lc-title">Calculus 8th Ed.</p>
              <p className="lc-price">R 180</p>
              <span className="lc-badge">Sale</span>
            </div>
          </div>
          <div className="listing-card card-float-2">
            <div className="lc-img" style={{ background: "linear-gradient(135deg,#ffd6a5,#ffe8c8)" }}>
              💻
            </div>
            <div className="lc-body">
              <p className="lc-title">Lenovo ThinkPad</p>
              <p className="lc-price">R 4,500</p>
              <span className="lc-badge lc-badge-trade">Trade</span>
            </div>
          </div>
          <div className="listing-card card-float-3">
            <div className="lc-img" style={{ background: "linear-gradient(135deg,#caffbf,#b7e4c7)" }}>
              🎮
            </div>
            <div className="lc-body">
              <p className="lc-title">PS5 Controller</p>
              <p className="lc-price">R 650</p>
              <span className="lc-badge">Sale</span>
            </div>
          </div>
          <div className="hero-trust-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d1b2a" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Secure campus trade hub
          </div>
        </div>
      </header>

      <section className="cta-banner">
        <div className="cta-inner">
          <h2 className="cta-title">
            Your campus marketplace
            <br />
            is waiting for you.
          </h2>
          <p className="cta-sub">
            Join thousands of students already buying, selling, and trading on UniMart.
          </p>
          <button className="btn-primary btn-large" onClick={() => openAuth("signup")}>
            Start trading
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </section>

      <div className="marquee-track" aria-hidden="true">
        <div className="marquee-inner">
          {marqueeItems.map((item, index) => (
            <span key={`${item}-${index}`} className="marquee-item">
              {item} <span className="marquee-dot">✦</span>
            </span>
          ))}
        </div>
      </div>

      <section className="section categories-section" id="categories">
        <header className="section-label">Browse categories</header>
        <h2 className="section-title">
          Everything a student
          <br />
          could possibly need.
        </h2>
        <div className="categories-grid">
          {categories.map((category) => (
            <button
              key={category.label}
              className="cat-card"
              onClick={() => openAuth("signup")}
            >
              <span className="cat-icon">{category.icon}</span>
              <span className="cat-label">{category.label}</span>
              <span className="cat-arrow">→</span>
            </button>
          ))}
        </div>
      </section>

      <section className="section how-section" id="how-it-works">
        <div className="how-inner">
          <div className="how-left">
            <header className="section-label light">How it works</header>
            <h2 className="section-title light">
              Four steps
              <br />
              to a done deal.
            </h2>
            <p className="how-desc">
              UniMart was designed from the ground up for student safety and convenience.
              Every transaction goes through our verified campus trade hub.
            </p>
            <button className="btn-primary" onClick={() => openAuth("signup")}>
              Get started
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="how-right">
            {howItWorks.map((step, index) => (
              <article
                key={step.step}
                className="step-card"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="step-number">{step.step}</div>
                <article className="step-body">
                  <h3 className="step-title">{step.title}</h3>
                  <p className="step-text">{step.body}</p>
                </article>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-inner">
          <div className="nav-logo">
            <span className="nav-logo-mark">UM</span>
            <span className="nav-logo-text">UniMart</span>
          </div>
          <p className="footer-text">
            © 2026 UniMart · Built for students, by students · Wits University
          </p>
        </div>
      </footer>
    </main>
  );
};

export default LandingPage;
