"use client";

import Navbar from "@/components/Navbar";
import Tarifs from "@/components/Tarifs";
import PriceSimulator from "@/components/PriceSimulator";
import Footer from "@/components/Footer";
import Toast from "@/components/Toast";
import { useCallback } from "react";

export default function ServicesPage() {
  const showToast = useCallback((msg: string) => {
    if (typeof window !== "undefined" && (window as Window & { __showToast?: (msg: string) => void }).__showToast) {
      (window as Window & { __showToast?: (msg: string) => void }).__showToast!(msg);
    }
  }, []);

  return (
    <>
      <Navbar />
      <main style={{ paddingTop: 80 }}>
        <Tarifs onToast={showToast} />
        <PriceSimulator />
      </main>
      <Footer />
      <Toast />
    </>
  );
}
