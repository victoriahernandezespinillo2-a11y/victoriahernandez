"use client";

import { useState, useEffect } from "react";
import { HeroSection } from "./components/HeroSection";
import { FeaturesSection } from "./components/FeaturesSection";
import { SportsSection } from "./components/SportsSection";
import { ActivitiesSection } from "./components/ActivitiesSection";
import { StatsSection } from "./components/StatsSection";
import { TestimonialsSection } from "./components/TestimonialsSection";
import { SponsorsSection } from "./components/SponsorsSection";
import { NewsSection } from "./components/NewsSection";
import { InfoSection } from "./components/InfoSection";
import { CTASection } from "./components/CTASection";

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className={`min-h-screen ${isLoaded ? 'animate-slide-up' : 'opacity-0'}`}>
      {/* Hero Section */}
      <section id="inicio">
        <HeroSection />
      </section>
      
      {/* Features Section */}
      <section id="instalaciones">
        <FeaturesSection />
      </section>
      
      {/* Sports & Facilities Section */}
      <section id="deportes">
        <SportsSection />
      </section>
      
      {/* Activities & Events Section */}
      <section id="actividades">
        <ActivitiesSection />
      </section>
      
      {/* Stats Section */}
      <section id="estadisticas">
        <StatsSection />
      </section>
      
      {/* Testimonials Section */}
      <section id="testimonios">
        <TestimonialsSection />
      </section>
      
      {/* Sponsors Section */}
      <section id="patrocinadores">
        <SponsorsSection />
      </section>
      
      {/* News & Blog Section */}
      <section id="noticias">
        <NewsSection />
      </section>
      
      {/* Information Section */}
      <section id="info">
        <InfoSection />
      </section>
      
      {/* Final CTA Section */}
      <section id="tarifas">
        <CTASection />
      </section>
    </div>
  );
}
