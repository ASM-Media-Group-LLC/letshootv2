'use client';

import AuthDoor from '@/components/AuthDoor';

// Puerta nueva (correo primero) SOLO para /signup — /login queda con su página de siempre.
// Si el correo ya tiene cuenta, el flujo le pide su contraseña y entra, en vez de rebotarla
// con "Ese correo ya tiene cuenta". Ver components/AuthDoor.jsx.
export default function SignupPage() {
  return <AuthDoor intent="new" />;
}
