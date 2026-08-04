import { redirect } from 'next/navigation';

// /numbers is an alias — the sales ledger lives at /sales.
export default function NumbersPage() {
  redirect('/sales');
}
