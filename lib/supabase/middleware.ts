import { createServerClient, type CookieOptions } from '@supabase/ssr' // เพิ่มการ import type
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        // ใส่ Type ให้กับ cookiesToSet ตรงนี้
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => 
            request.cookies.set(name, value)
          )
          
          supabaseResponse = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  if (pathname === '/admin/usermanage') {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/fieldmanage'
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  // If user is NOT logged in and tries to access protected routes, redirect to login
  const protectedPaths = ['/bookings', '/fields']
  const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))
  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  // If user is logged in and is an admin, visiting '/' should go straight to '/admin'
  if (user && pathname === '/') {
    try {
      const { data: roleRow } = await supabase
        .from('users')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (roleRow?.role === 'admin') {
        const url = request.nextUrl.clone()
        url.pathname = '/admin'
        const redirectResponse = NextResponse.redirect(url)
        supabaseResponse.cookies.getAll().forEach((cookie) => {
          redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
        })
        return redirectResponse
      }
    } catch {
      // ignore
    }
  }

  // If user HAS a session (is logged in) and tries to access '/login' or '/register', redirect to home
  if (user && (pathname === '/login' || pathname === '/register')) {
    const url = request.nextUrl.clone()
    try {
      const { data: roleRow } = await supabase
        .from('users')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (roleRow?.role === 'admin') {
        url.pathname = '/admin'
      } else {
        url.pathname = '/'
      }
    } catch {
      url.pathname = '/'
    }
    // Create redirect response and preserve cookies
    const redirectResponse = NextResponse.redirect(url)
    // Copy cookies from supabaseResponse to maintain session
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  // (No redirect from '/' for logged-in users — logged-in users will see the logged-in home at '/')

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  return supabaseResponse
}

