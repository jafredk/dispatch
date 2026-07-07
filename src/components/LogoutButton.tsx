'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'

interface LogoutButtonProps {
  className?: string
  label?: string
}

export default function LogoutButton({ className = '', label = 'Logout' }: LogoutButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    if (loading) return
    if (!auth) return
    setLoading(true)

    try {
      await signOut(auth)
      router.replace('/login')
    } catch (error) {
      console.error('Logout error:', error)
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={className}
    >
      {loading ? 'Signing out...' : label}
    </button>
  )
}
