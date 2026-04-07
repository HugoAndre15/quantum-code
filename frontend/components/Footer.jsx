import Image from "next/image";
import { navLinks, siteConfig } from "../data/siteData";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-logo">
        <Image
          src="/images/high-resolution-color-logo (1).png"
          alt={siteConfig.name}
          width={32}
          height={32}
          style={{
            objectFit: "cover",
            objectPosition: "center 30%",
            borderRadius: 6,
          }}
        />
        Quantum <b>Code</b>
      </div>
      <div className="footer-links">
        {navLinks.map((l) => (
          <a key={l.href} href={l.href}>
            {l.label}
          </a>
        ))}
      </div>
      <div className="footer-copy">
        {siteConfig.copyright} — Développeur web freelance dans{" "}
        {siteConfig.locationShort}
      </div>
    </footer>
  );
}
