"use client";

import { useCallback } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Ticker from "@/components/Ticker";
import About from "@/components/About";
import Portfolio from "@/components/Portfolio";
import Tarifs from "@/components/Tarifs";
import PriceSimulator from "@/components/PriceSimulator";
import FAQ from "@/components/FAQ";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import Toast from "@/components/Toast";

export default function Home() {
  const showToast = useCallback((msg: string) => {
    if (typeof window !== "undefined" && (window as Window & { __showToast?: (msg: string) => void }).__showToast) {
      (window as Window & { __showToast?: (msg: string) => void }).__showToast!(msg);
    }
  }, []);

  return (
    <>
      <Navbar />
      <Hero />
      <Ticker />
      <About />
      <Portfolio />
      <Tarifs onToast={showToast} />
      <PriceSimulator />
      <FAQ />
      <Contact onToast={showToast} />
      <Footer />
      <Toast />
    </>
  );
}
