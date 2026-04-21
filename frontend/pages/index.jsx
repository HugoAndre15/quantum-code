"use client";
import { useCallback } from "react";
import Head from "next/head";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Ticker from "../components/Ticker";
import About from "../components/About";
import Portfolio from "../components/Portfolio";
import Tarifs from "../components/Tarifs";
import PriceSimulator from "../components/PriceSimulator";
import FAQ from "../components/FAQ";
import Contact from "../components/Contact";
import Footer from "../components/Footer";
import Toast from "../components/Toast";
import { seo, siteConfig } from "../data/siteData";

export default function Home() {
  const showToast = useCallback((msg) => {
    if (typeof window !== "undefined" && window.__showToast) {
      window.__showToast(msg);
    }
  }, []);

  return (
    <>
      <Head>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta name="keywords" content={seo.keywords} />
        <meta name="author" content={siteConfig.name} />
        <meta name="robots" content="index, follow" />
        <meta name="geo.region" content="FR-60" />
        <meta name="geo.placename" content={siteConfig.location} />
        <link rel="canonical" href={`${siteConfig.url}/`} />
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content={`Développeur Web Freelance Oise — ${siteConfig.name}`}
        />
        <meta property="og:description" content={seo.description} />
        <meta property="og:url" content={`${siteConfig.url}/`} />
        <meta property="og:image" content={seo.ogImage} />
        <meta property="og:locale" content="fr_FR" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content={`Développeur Web Freelance Oise — ${siteConfig.name}`}
        />
        <meta name="twitter:description" content={seo.description} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(seo.jsonLd) }}
        />
      </Head>

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
