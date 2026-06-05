import Nav from '@/components/Nav';
import CinematicHero from '@/components/CinematicHero';
import EditorSection from '@/components/EditorSection';
import HowItWorks from '@/components/HowItWorks';
import FeatureGrid from '@/components/FeatureGrid';
import Comparison from '@/components/Comparison';
import BeforeAfterSection from '@/components/BeforeAfterSection';
import Results from '@/components/Results';
import Pricing from '@/components/Pricing';
import FinalCta from '@/components/FinalCta';
import Footer from '@/components/Footer';

export default function Page() {
  // z-10 so sections stack above the fixed MeshBg canvas
  return (
    <main className="relative z-10 min-h-screen">
      <Nav />
      <CinematicHero />
      <EditorSection />
      <HowItWorks />
      <FeatureGrid id="creators" sectionKey="creators" />
      <FeatureGrid id="agencies" sectionKey="agencies" />
      <Comparison />
      <BeforeAfterSection />
      <Results />
      <Pricing />
      <FinalCta />
      <Footer />
    </main>
  );
}
