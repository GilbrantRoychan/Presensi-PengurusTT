'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const IDLE_TIMEOUT_MS = 5 * 60 * 1000
const LAST_ACTIVITY_COOKIE = 'presensi_last_activity'
const LAST_ACTIVITY_STORAGE_KEY = 'presensi_last_activity'

function updateActivityTimestamp(timestamp: number) {
  localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, String(timestamp))
  document.cookie = `${LAST_ACTIVITY_COOKIE}=${timestamp}; Max-Age=300; Path=/; SameSite=Lax`
}

export default function SessionTimeout() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let hasSession = false

    const clearTimeoutAndActivity = () => {
      if (timeoutId) clearTimeout(timeoutId)
      localStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY)
      document.cookie = `${LAST_ACTIVITY_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`
    }

    const signOutForInactivity = async () => {
      clearTimeoutAndActivity()
      await supabase.auth.signOut()
      router.replace('/login')
      router.refresh()
    }

    const scheduleTimeout = () => {
      if (timeoutId) clearTimeout(timeoutId)

      const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY))
      const remaining = IDLE_TIMEOUT_MS - (Date.now() - lastActivity)

      if (!lastActivity || remaining <= 0) {
        void signOutForInactivity()
        return
      }

      timeoutId = setTimeout(() => void signOutForInactivity(), remaining)
    }

    const handleActivity = () => {
      if (!hasSession) return
      updateActivityTimestamp(Date.now())
      scheduleTimeout()
    }

    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      hasSession = Boolean(session)
      if (hasSession) scheduleTimeout()
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      hasSession = Boolean(session)
      if (hasSession) {
        if (event === 'SIGNED_IN') updateActivityTimestamp(Date.now())
        scheduleTimeout()
      } else {
        clearTimeoutAndActivity()
      }
    })

    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const
    activityEvents.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }))
    void initialize()

    return () => {
      subscription.unsubscribe()
      if (timeoutId) clearTimeout(timeoutId)
      activityEvents.forEach((event) => window.removeEventListener(event, handleActivity))
    }
  }, [router])

  return null
}