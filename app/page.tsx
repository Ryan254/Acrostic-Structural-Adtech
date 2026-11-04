'use client'

import { useEffect, useState } from 'react'
import AdtechApp from '@/components/adtech-app'

export default function Page() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <main className="app-shell" aria-busy="true" />
  }

  return <AdtechApp />
}
