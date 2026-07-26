'use client';

import LegalPage, { Section, useLegalLang, COMPANY, SITE, CONTACT_EMAIL } from '@/components/LegalPage';

const C = {
  es: {
    title: 'Términos de servicio',
    s: [
      ['1. Quiénes somos', [
        `${SITE} (el "Servicio") es operado por ${COMPANY} ("nosotros"). El Servicio genera contenido fotográfico y de video mediante inteligencia artificial a partir de la imagen de la persona creadora, para su uso comercial en plataformas de contenido para adultos y redes sociales.`,
      ]],
      ['2. Elegibilidad — solo mayores de 18 años', [
        'El Servicio está destinado exclusivamente a personas mayores de 18 años (o la mayoría de edad aplicable en tu jurisdicción, si es mayor). Antes de activar el Servicio verificamos tu identidad y tu edad con documento oficial y selfie de comprobación. Proporcionar información o documentos falsos es causa de terminación inmediata y puede ser reportado a las autoridades.',
      ]],
      ['3. Consentimiento para tu clon digital', [
        'Al contratar, firmas consentimientos explícitos que autorizan a crear y usar un modelo digital ("clon" / LoRA) basado en tu imagen, únicamente para generar contenido para ti. Nunca usamos tu imagen para otros clientes ni para fines distintos a los contratados. Solo puedes solicitar un clon de tu propia imagen — está prohibido pedir clones de terceros.',
      ]],
      ['4. Tu contenido y licencias', [
        `Tú conservas los derechos sobre tu imagen. Nos otorgas una licencia limitada para procesar tus fotos (verificación y set de entrenamiento) con el único fin de prestar el Servicio. El contenido generado que te entregamos queda licenciado a tu favor para tu uso comercial y personal. Podemos usar material anonimizado o de demostración solo con tu autorización expresa.`,
      ]],
      ['5. Pagos, renovación y cancelación', [
        'El Servicio se cobra por suscripción recurrente a través de procesadores de pago externos autorizados para contenido de adultos. El cobro solo se realiza después de que tu verificación de identidad es aprobada y tu consentimiento está firmado. Puedes cancelar en cualquier momento desde tu cuenta o escribiendo a ' + CONTACT_EMAIL + '; la cancelación aplica al siguiente ciclo de facturación.',
      ]],
      ['6. Reembolsos', [
        'Si rechazamos tu verificación, no se te cobra (o se anula/reembolsa cualquier autorización pendiente). Una vez entregado contenido del ciclo en curso, los cargos de ese ciclo no son reembolsables, salvo que la ley aplicable o el procesador de pago dispongan otra cosa. Para disputas de facturación contáctanos primero: casi siempre lo resolvemos más rápido que el banco.',
      ]],
      ['7. Usos prohibidos', [
        'Está prohibido: usar la imagen de terceros sin ser tú; suplantar identidades; solicitar contenido que involucre menores (tolerancia cero — se reporta a las autoridades), violencia real, o cualquier contenido ilegal; revender el Servicio sin acuerdo escrito; intentar vulnerar la seguridad de la plataforma.',
      ]],
      ['8. Terminación', [
        'Podemos suspender o terminar cuentas que incumplan estos términos. Tú puedes cerrar tu cuenta cuando quieras; a solicitud eliminamos tu clon y tus datos según nuestra Política de privacidad.',
      ]],
      ['9. Limitación de responsabilidad', [
        `El Servicio se presta "tal cual". En la máxima medida permitida por la ley, ${COMPANY} no será responsable por daños indirectos, lucro cesante o pérdidas derivadas del uso del contenido en plataformas de terceros (cuyos términos eres responsable de cumplir).`,
      ]],
      ['10. Ley aplicable', [
        `Estos términos se rigen por las leyes del Estado de Florida, EE. UU. Cualquier disputa se someterá a los tribunales competentes de dicho estado. Contacto: ${CONTACT_EMAIL}.`,
      ]],
    ],
  },
  en: {
    title: 'Terms of Service',
    s: [
      ['1. Who we are', [
        `${SITE} (the "Service") is operated by ${COMPANY} ("we"). The Service generates photo and video content using artificial intelligence from the creator's own likeness, for commercial use on adult-content platforms and social media.`,
      ]],
      ['2. Eligibility — 18+ only', [
        'The Service is intended exclusively for persons 18 years of age or older (or the applicable age of majority in your jurisdiction, if higher). Before activating the Service we verify your identity and age with a government ID and a verification selfie. Providing false information or documents results in immediate termination and may be reported to authorities.',
      ]],
      ['3. Consent for your digital clone', [
        'When you subscribe, you sign explicit consents authorizing us to create and use a digital model ("clone" / LoRA) based on your likeness, solely to generate content for you. We never use your likeness for other clients or for purposes other than those contracted. You may only request a clone of your own likeness — requesting clones of third parties is prohibited.',
      ]],
      ['4. Your content and licenses', [
        'You retain the rights to your likeness. You grant us a limited license to process your photos (verification and training set) for the sole purpose of providing the Service. Generated content delivered to you is licensed to you for your commercial and personal use. We only use anonymized or demo material with your express authorization.',
      ]],
      ['5. Payments, renewal and cancellation', [
        'The Service is billed as a recurring subscription through third-party payment processors authorized for adult content. You are only charged after your identity verification is approved and your consent is signed. You may cancel at any time from your account or by writing to ' + CONTACT_EMAIL + '; cancellation applies to the next billing cycle.',
      ]],
      ['6. Refunds', [
        'If we reject your verification, you are not charged (and any pending authorization is voided/refunded). Once content for the current cycle has been delivered, that cycle’s charges are non-refundable except where applicable law or the payment processor provides otherwise. For billing disputes contact us first — we usually resolve issues faster than your bank.',
      ]],
      ['7. Prohibited uses', [
        'The following are prohibited: using the likeness of anyone other than yourself; impersonation; requesting content involving minors (zero tolerance — reported to authorities), real violence, or any illegal content; reselling the Service without a written agreement; attempting to breach platform security.',
      ]],
      ['8. Termination', [
        'We may suspend or terminate accounts that breach these terms. You may close your account at any time; upon request we delete your clone and your data per our Privacy Policy.',
      ]],
      ['9. Limitation of liability', [
        `The Service is provided "as is". To the maximum extent permitted by law, ${COMPANY} is not liable for indirect damages, lost profits, or losses arising from the use of content on third-party platforms (whose terms you are responsible for complying with).`,
      ]],
      ['10. Governing law', [
        `These terms are governed by the laws of the State of Florida, USA. Any dispute shall be submitted to the competent courts of that state. Contact: ${CONTACT_EMAIL}.`,
      ]],
    ],
  },
};

export default function TermsPage() {
  const l = useLegalLang();
  const c = C[l];
  return (
    <LegalPage title={c.title}>
      {c.s.map(([h, ps]) => (
        <Section key={h} h={h}>{ps.map((p, i) => <p key={i}>{p}</p>)}</Section>
      ))}
    </LegalPage>
  );
}
