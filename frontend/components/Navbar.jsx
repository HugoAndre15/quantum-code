"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { navLinks, siteConfig } from "../data/siteData";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const clickCount = useRef(0);
  const clickTimer = useRef(null);
  const router = useRouter();

  const handleLogoClick = useCallback(
    (e) => {
      e.preventDefault();
      clickCount.current += 1;
      if (clickTimer.current) clearTimeout(clickTimer.current);
      if (clickCount.current >= 5) {
        clickCount.current = 0;
        router.push("/admin");
      } else {
        clickTimer.current = setTimeout(() => {
          clickCount.current = 0;
        }, 1500);
      }
    },
    [router],
  );

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <>
      <nav className={`navbar${scrolled ? " scrolled" : ""}`}>
        <a href="#" className="nav-logo" onClick={handleLogoClick}>
          <Image
            src="/images/high-resolution-color-logo (1).png"
            alt={siteConfig.name}
            width={36}
            height={36}
            style={{
              objectFit: "cover",
              objectPosition: "center 30%",
              borderRadius: 6,
            }}
            priority
          />
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
