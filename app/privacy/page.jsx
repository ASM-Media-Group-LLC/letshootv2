'use client';

import LegalPage, { Section, useLegalLang, COMPANY, CONTACT_EMAIL } from '@/components/LegalPage';

const C = {
  es: {
    title: 'Política de privacidad',
    s: [
      ['1. Datos que recopilamos', [
        'Cuenta: correo, contraseña (cifrada), nombre artístico, teléfono e idioma. Verificación (KYC): nombre legal, fecha de nacimiento, país, imágenes de tu documento de identidad y selfie de comprobación. Servicio: fotos del set de entrenamiento de tu clon, contenido entregado, carpetas, pedidos, feedback y notificaciones. Técnicos: registros básicos de uso y facturación (los datos de tarjeta los maneja únicamente el procesador de pago — nunca los vemos ni almacenamos).',
      ]],
      ['2. Para qué los usamos', [
        'Verificar tu identidad y edad (obligación legal para contenido de adultos); crear y operar tu clon digital con tu consentimiento; entregarte contenido y notificarte; cobrar la suscripción; dar soporte; y cumplir obligaciones legales (incl. mantenimiento de registros de verificación de edad).',
      ]],
      ['3. Dónde se guardan', [
        'Los datos se almacenan en infraestructura cifrada (Supabase/AWS, región EE. UU.). Tus documentos de identidad y tus fotos viven en almacenamiento privado con control de acceso por fila: solo tú y el personal administrador autorizado pueden verlos. El equipo operativo solo ve tu nombre artístico.',
      ]],
      ['4. Con quién los compartimos', [
        'Con procesadores de pago (para cobrar y prevenir fraude), con proveedores de infraestructura (hosting, correo transaccional) y con autoridades cuando la ley lo exige. Nunca vendemos tus datos ni compartimos tu imagen o tu clon con otros clientes.',
      ]],
      ['5. Retención', [
        'Conservamos los registros de verificación de identidad y consentimiento mientras la ley lo exija. El resto de tus datos se conserva mientras tu cuenta esté activa. Al cerrar tu cuenta puedes solicitar la eliminación de tu clon, tu set de entrenamiento y tu contenido.',
      ]],
      ['6. Tus derechos', [
        `Puedes acceder, corregir o eliminar tus datos, y retirar tu consentimiento para el uso de tu clon en cualquier momento, escribiendo a ${CONTACT_EMAIL} desde el correo de tu cuenta. Respondemos en un máximo de 30 días.`,
      ]],
      ['7. Seguridad', [
        'Aplicamos control de acceso por rol y por fila (RLS), almacenamiento privado con URLs firmadas temporales, cifrado en tránsito y en reposo, y verificación del lado del servidor para las operaciones sensibles.',
      ]],
      ['8. Menores', [
        'El Servicio es solo para adultos. No recopilamos datos de menores a sabiendas; cualquier cuenta sospechosa de pertenecer a un menor se elimina de inmediato.',
      ]],
      ['9. Cambios y contacto', [
        `Publicaremos aquí cualquier cambio a esta política. Responsable: ${COMPANY}. Contacto: ${CONTACT_EMAIL}.`,
      ]],
    ],
  },
  en: {
    title: 'Privacy Policy',
    s: [
      ['1. Data we collect', [
        'Account: email, password (encrypted), stage name, phone and language. Verification (KYC): legal name, date of birth, country, images of your government ID and a verification selfie. Service: your clone training photos, delivered content, folders, requests, feedback and notifications. Technical: basic usage and billing records (card data is handled solely by the payment processor — we never see or store it).',
      ]],
      ['2. How we use it', [
        'To verify your identity and age (a legal obligation for adult content); create and operate your digital clone with your consent; deliver content and notify you; bill your subscription; provide support; and comply with legal obligations (including age-verification record keeping).',
      ]],
      ['3. Where it is stored', [
        'Data is stored on encrypted infrastructure (Supabase/AWS, US region). Your ID documents and photos live in private storage with row-level access control: only you and authorized admin staff can see them. The operations team only sees your stage name.',
      ]],
      ['4. Who we share it with', [
        'Payment processors (billing and fraud prevention), infrastructure providers (hosting, transactional email), and authorities where required by law. We never sell your data or share your likeness or clone with other clients.',
      ]],
      ['5. Retention', [
        'We keep identity-verification and consent records for as long as the law requires. Other data is kept while your account is active. When you close your account you may request deletion of your clone, training set and content.',
      ]],
      ['6. Your rights', [
        `You may access, correct or delete your data, and withdraw consent for the use of your clone at any time, by writing to ${CONTACT_EMAIL} from your account email. We respond within 30 days.`,
      ]],
      ['7. Security', [
        'We apply role- and row-level access control (RLS), private storage with temporary signed URLs, encryption in transit and at rest, and server-side verification for sensitive operations.',
      ]],
      ['8. Minors', [
        'The Service is for adults only. We do not knowingly collect data from minors; any account suspected of belonging to a minor is deleted immediately.',
      ]],
      ['9. Changes and contact', [
        `Any changes to this policy will be posted here. Controller: ${COMPANY}. Contact: ${CONTACT_EMAIL}.`,
      ]],
    ],
  },
};

export default function PrivacyPage() {
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
