import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const IDLE_TIMEOUT_MS = 5 * 60 * 1000
const LAST_ACTIVITY_COOKIE = 'presensi_last_activity'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const lastActivity = Number(request.cookies.get(LAST_ACTIVITY_COOKIE)?.value)
  const isIdle = !lastActivity || Date.now() - lastActivity >= IDLE_TIMEOUT_MS
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')

  if (isAdminRoute && (!user || isIdle)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}