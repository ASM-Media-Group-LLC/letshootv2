import Nav from '@/components/Nav';
import CinematicHero from '@/components/CinematicHero';
import Comparison from '@/components/Comparison';
import Solution from '@/components/Solution';
import ContentLibraries from '@/components/ContentLibraries';
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
      <Nav />
      <CinematicHero />
      <Comparison />
      <Solution />
      <ContentLibraries />
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
