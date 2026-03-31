"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { navLinks, siteConfig } from "../data/siteData";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <>
      <nav className={`navbar${scrolled ? " scrolled" : ""}`}>
        <a href="#" className="nav-logo">
          <div className="nav-logo-mark">
            <span>Q</span>
          </div>
          Quantum <b>Code</b>
        </a>

        <div className="nav-links">
          {navLinks.map((l) => (
            <a key={l.href} className="nav-link" href={l.href}>
              {l.label}
            </a>
          ))}
        </div>

        <div className="nav-right">
          <Link href="/login" className="nav-admin">
            <div className="nav-admin-dot" />
            Admin
          </Link>
          <a
            href="#contact"
            className="btn btn-blue"
            style={{ padding: "9px 18px", fontSize: 12 }}
          >
            Devis gratuit
          </a>
          <div
            className="nav-hamburger"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <span />
            <span />
            <span />
          </div>
        </div>
      </nav>

      <div className={`mobile-menu${mobileOpen ? " open" : ""}`}>
        {navLinks.map((l) => (
          <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)}>
            {l.label}
          </a>
        ))}
        <a
          href="#contact"
          className="btn btn-blue"
          style={{ alignSelf: "flex-start" }}
          onClick={() => setMobileOpen(false)}
        >
          Devis gratuit
        </a>
      </div>
    </>
  );
}
