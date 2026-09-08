// Ruta pública dinámica de propuestas: /p/<CODE> (y /p/demo → fallback DEMO).
import PropuestaViewer from '@/components/PropuestaViewer';

export default function Page({ params }) {
  return <PropuestaViewer linkId={params.linkId} />;
}
