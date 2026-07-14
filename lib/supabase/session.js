'use client';

import { getSupabase } from './client';

// Sign in with email + password, then load the profile (role, name).
export async function signIn(email, password) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email).trim().toLowerCase(),
    password,
  });
  if (error) return { error: error.message };
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', data.user.id)
    .single();
  return { user: data.user, profile };
}

// Current logged-in user + profile (or null).
export async function getUserProfile() {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', user.id)
    .single();
  return { user, profile };
}

export async function signOut() {
  await getSupabase().auth.signOut();
}

// Where each role lands after login.
export function homeForRole(role) {
  switch (role) {
    case 'admin': return '/admin';
    case 'chatter': return '/admin';
    case 'producer': return '/admin';
    case 'creator':
    default: return '/panel';
  }
}
