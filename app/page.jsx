import Nav from '@/components/Nav';
import CinematicHero from '@/components/CinematicHero';
import EditorSection from '@/components/EditorSection';
import HowItWorks from '@/components/HowItWorks';
import FeatureGrid from '@/components/FeatureGrid';
import Comparison from '@/components/Comparison';
import Results from '@/components/Results';
import Pricing from '@/components/Pricing';
import ValueCalculators from '@/components/ValueCalculators';
import FinalCta from '@/components/FinalCta';
import Footer from '@/components/Footer';

export default function Page() {
  return (
    <main className="relative z-10 min-h-screen">
      <Nav />
      <CinematicHero />
      <EditorSection />
      <HowItWorks />
      <FeatureGrid id="creators" sectionKey="creators" />
      <FeatureGrid id="agencies" sectionKey="agencies" />
      <Comparison />
      <Results />
      <Pricing />
      <ValueCalculators />
      <FinalCta />
      <Footer />
    </main>
  );
}
