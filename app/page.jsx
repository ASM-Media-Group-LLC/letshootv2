import Nav from '@/components/Nav';
import AuthCodeCatcher from '@/components/AuthCodeCatcher';
import CinematicHero from '@/components/CinematicHero';
import RealVsAI from '@/components/RealVsAI';
import Comparison from '@/components/Comparison';
import Solution from '@/components/Solution';
import Showcase from '@/components/Showcase';
import HowItWorks from '@/components/HowItWorks';
import Results from '@/components/Results';
import Pricing from '@/components/Pricing';
import RevisionPolicy from '@/components/RevisionPolicy';
import FinalCta from '@/components/FinalCta';
import Footer from '@/components/Footer';

export default function Page() {
  return (
    <main className="relative z-10 min-h-screen">
      <AuthCodeCatcher />
      <Nav />
      <CinematicHero />
      <RealVsAI />
      <Comparison />
      <Solution />
      <Showcase />
      <HowItWorks />
      <Results />
      <Pricing />
      <RevisionPolicy />
      <FinalCta />
      <Footer />
    </main>
  );
}
