'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function SignOut() {
  const router = useRouter()
  return (
    <button
      onClick={async () => {
        await createClient().auth.signOut()
        router.push('/login')
        router.refresh()
      }}
      className="focusable min-h-10 px-3 text-[12px] font-medium rounded-[8px] border"
      style={{ borderColor: 'var(--line)', color: 'var(--fg-3)' }}
    >
      Sign out
    </button>
  )
}
