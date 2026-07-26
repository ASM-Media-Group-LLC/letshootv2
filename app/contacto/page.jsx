'use client';

import { Mail, Building2, Clock } from 'lucide-react';
import LegalPage, { Section, useLegalLang, COMPANY, CONTACT_EMAIL } from '@/components/LegalPage';

export default function ContactoPage() {
  const l = useLegalLang();
  const es = l === 'es';
  return (
    <LegalPage title={es ? 'Contacto' : 'Contact'}>
      <Section h={es ? 'Atención y soporte' : 'Support'}>
        <p>
          {es
            ? 'Para soporte, facturación, privacidad o cualquier consulta sobre el servicio, escríbenos — respondemos normalmente en menos de 24 horas hábiles.'
            : 'For support, billing, privacy, or any question about the service, write to us — we usually reply within 24 business hours.'}
        </p>
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3">
            <Mail size={18} className="shrink-0 text-brand" />
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-paper hover:text-brand">{CONTACT_EMAIL}</a>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3">
            <Building2 size={18} className="shrink-0 text-brand" />
            <span className="text-paper">{COMPANY} · Miami, FL, USA</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3">
            <Clock size={18} className="shrink-0 text-brand" />
            <span>{es ? 'Lunes a viernes · 9:00–18:00 (ET)' : 'Monday–Friday · 9:00 AM–6:00 PM (ET)'}</span>
          </div>
        </div>
      </Section>
      <Section h={es ? 'Facturación' : 'Billing'}>
        <p>
          {es
            ? 'Los cargos aparecen a nombre del procesador de pago autorizado. Antes de disputar un cargo con tu banco, contáctanos: resolvemos la mayoría de los casos el mismo día.'
            : 'Charges appear under the name of the authorized payment processor. Before disputing a charge with your bank, contact us: we resolve most cases the same day.'}
        </p>
      </Section>
    </LegalPage>
  );
}
