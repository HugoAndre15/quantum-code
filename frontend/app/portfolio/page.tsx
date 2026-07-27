"use client";

import Navbar from "@/components/Navbar";
import Portfolio from "@/components/Portfolio";
import Footer from "@/components/Footer";

export default function PortfolioPage() {
  return (
    <>
      <Navbar />
      <main style={{ paddingTop: 80 }}>
        <Portfolio />
      </main>
      <Footer />
    </>
  );
}
