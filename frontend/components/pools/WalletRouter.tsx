'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAccount } from 'wagmi'

const APP_ROUTE_PREFIX = '/pools'
const DEFAULT_APP_ROUTE = '/pools'

export function WalletRouter() {
  const { isConnected, status } = useAccount()
  const router = useRouter()
  const pathname = usePathname()
  const lastAppRoute = useRef<string | null>(null)

  useEffect(() => {
    if (pathname.startsWith(APP_ROUTE_PREFIX)) {
      lastAppRoute.current = pathname
    }
  }, [pathname])

  useEffect(() => {
    if (status === 'connecting' || status === 'reconnecting') return

    if (!isConnected && pathname.startsWith(APP_ROUTE_PREFIX)) {
      router.replace('/')
      return
    }

    if (isConnected && pathname === '/') {
      router.replace(lastAppRoute.current ?? DEFAULT_APP_ROUTE)
    }
  }, [isConnected, status, pathname, router])

  return null
}