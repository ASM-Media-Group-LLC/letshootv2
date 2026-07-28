// Legacy route. The clone-photo flow now lives in the onboarding guide
// (bilingual ES/EN, 50/80 target, per-category real examples); /onboarding
// itself forwards active creators to /panel, where the LoRA top-up uploader
// lives. Kept as a redirect so old links keep working.
import { redirect } from 'next/navigation';

export default function LoraLegacyPage() {
  redirect('/onboarding');
}
