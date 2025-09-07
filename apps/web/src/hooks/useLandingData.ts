import { useState, useEffect } from 'react';

interface HeroSlide {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  isActive: boolean;
  order: number;
}

interface Testimonial {
  id: string;
  name: string;
  role?: string;
  company?: string;
  content: string;
  rating: number;
  imageUrl?: string;
  sport?: string;
  experience?: string;
  highlight?: string;
  isActive: boolean;
  order: number;
}

interface Sponsor {
  id: string;
  name: string;
  category?: string;
  logoUrl?: string;
  description?: string;
  website?: string;
  partnership?: string;
  since?: string;
  tier: 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE';
  benefits: string[];
  isActive: boolean;
  order: number;
}

interface Stat {
  id: string;
  value: string;
  suffix?: string;
  label: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  order: number;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  isActive: boolean;
  order: number;
}

interface SportFacility {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  imageUrl?: string;
  price: string;
  availability: string;
  rating: number;
  features: string[];
  isActive: boolean;
  order: number;
}

interface SportCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  description?: string;
  isActive: boolean;
  order: number;
  facilities: SportFacility[];
}

interface Activity {
  id: string;
  title: string;
  description: string;
  icon: string;
  schedule: string;
  color: string;
  isActive: boolean;
  order: number;
}

interface InfoCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  content: string;
  isActive: boolean;
  order: number;
}

interface LandingData {
  hero: HeroSlide[];
  testimonials: Testimonial[];
  sponsors: Sponsor[];
  stats: Stat[];
  faqs: FAQ[];
  sports: SportCategory[];
  sportsList: string[];
  activities: Activity[];
  infoCards: InfoCard[];
}

export function useLandingData() {
  const [data, setData] = useState<LandingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Reintentos exponenciales (3 intentos)
        let attempt = 0;
        let response: Response | null = null;
        let lastErr: unknown = null;
        while (attempt < 3) {
          try {
            response = await fetch('/api/landing', { cache: 'no-cache' });
            if (response.ok) break;
            lastErr = new Error(`HTTP ${response.status}`);
          } catch (e) {
            lastErr = e;
          }
          attempt += 1;
          await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 4000)));
        }
        if (!response || !response.ok) {
          throw new Error('Error al cargar los datos de la landing page');
        }
        
        const landingData = await response.json();
        setData(landingData);
      } catch (err) {
        console.error('Error fetching landing data:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return {
    data,
    loading,
    error,
    hero: data?.hero || [],
    testimonials: data?.testimonials || [],
    sponsors: data?.sponsors || [],
    stats: data?.stats || [],
    faqs: data?.faqs || [],
    sports: data?.sports || [],
    sportsList: data?.sportsList || [],
    activities: data?.activities || [],
    infoCards: data?.infoCards || [],
  };
}
