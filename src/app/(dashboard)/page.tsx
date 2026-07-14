import { redirect } from 'next/navigation'

// Dashboard (redirect to /dashboard)
export default function IndexPage() {
  redirect('/dashboard')
}
