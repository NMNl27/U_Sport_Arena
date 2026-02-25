"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { User, Session } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import { User as UserProfile } from "@/types/supabase"

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any; profile: UserProfile | null }>
  signUp: (
    email: string,
    password: string,
    username: string,
    phone_number: string
  ) => Promise<{ error: any }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (
    data: { username?: string; email?: string; phone_number?: string },
    password: string
  ) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Create a browser Supabase client instance
  const supabase = createBrowserClient()

  // Fetch user profile from public.users table
  const fetchUserProfile = async (userId: string) => {
    try {
      // Try to select the expected columns. If the DB does not have `avatar_url`
      // (common when schema differs), retry without it to avoid breaking auth.
      const res = await supabase
        .from("users")
        .select("user_id, username, email, role, phone_number, membership_type")
        .eq("user_id", userId)
        .single()

      if (res.error) {
        console.error("Error fetching user profile:", res.error)
        return null
      }

      return res.data as UserProfile
    } catch (error) {
      console.error("Error fetching user profile:", error)
      return null
    }
  }

  // Refresh profile function
  const refreshProfile = async () => {
    if (user?.id) {
      const userProfile = await fetchUserProfile(user.id)
      setProfile(userProfile)
    }
  }

  // Update profile (username, email, phone) with password confirmation
  const updateProfile = async (
    data: { username?: string; email?: string; phone_number?: string },
    password: string
  ) => {
    if (!user) return { error: new Error("Not authenticated") }

    try {
      // Re-authenticate by signing in with password to ensure recent auth
      if (password) {
        const { data: signData, error: signError } = await supabase.auth.signInWithPassword({
          email: user.email || "",
          password,
        })

        if (signError) {
          console.error("AuthContext: re-authentication failed", signError)
          return { error: signError }
        }

        if (signData?.user) {
          setUser(signData.user)
          setSession(signData.session ?? null)
        }
      }

      // If email changed, update auth user email
      if (data.email && data.email !== user.email) {
        const { data: updatedAuthUser, error: updateUserError } = await supabase.auth.updateUser({
          email: data.email,
        })

        if (updateUserError) {
          console.error("AuthContext: error updating auth email", updateUserError)
          return { error: updateUserError }
        }

        if (updatedAuthUser?.user) {
          setUser(updatedAuthUser.user)
        }
      }

      // Update public.users table
      const updates: Record<string, any> = {}
      if (data.username !== undefined) updates.username = data.username
      if (data.email !== undefined) updates.email = data.email
      if (data.phone_number !== undefined) updates.phone_number = data.phone_number

      if (Object.keys(updates).length > 0) {
        const { data: updatedProfile, error: profileError } = await supabase
          .from("users")
          .update(updates)
          .eq("user_id", user.id)
          .select()
          .single()

        if (profileError) {
          console.error("AuthContext: error updating profile table", profileError)
          return { error: profileError }
        }

        setProfile(updatedProfile as UserProfile)
      }

      return { error: null }
    } catch (err) {
      console.error("AuthContext: unexpected error updateProfile", err)
      return { error: err }
    }
  }

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      console.log("AuthContext: Attempting sign in for:", email)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("AuthContext: Sign in error:", error)
        return { error, profile: null }
      }

      if (!data?.user) {
        return { error: new Error('No user returned from auth'), profile: null }
      }

      // Fetch profile before accepting login so we can enforce status_active
      const userProfile = await fetchUserProfile(data.user.id)
      if (userProfile && userProfile.status_active === false) {
        // Immediately sign out and reject login
        try {
          await supabase.auth.signOut()
        } catch (e) {
          console.error('AuthContext: error signing out disabled user', e)
        }
        return { error: new Error('บัญชีถูกระงับ (inactive)'), profile: null }
      }

      // Accept login
      setUser(data.user)
      setSession(data.session ?? null)
      setProfile(userProfile)
      console.log("AuthContext: Profile fetched successfully")

      return { error: null, profile: userProfile }
    } catch (err) {
      console.error("AuthContext: Unexpected error in signIn:", err)
      return {
        error: err instanceof Error ? err : new Error("An unexpected error occurred"),
        profile: null,
      }
    }
  }

  // Sign up function
  // Note: The Supabase trigger automatically inserts into public.users table
  const signUp = async (
    email: string,
    password: string,
    username: string,
    phone_number: string
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
          phone_number: phone_number,
          membership_type: "standard", // Default membership type
          status_active: true, // Ensure new users are active by default
        },
      },
    })

    // Just return the error if any, don't set user state or fetch profile
    // The trigger will handle inserting into public.users
    return { error }
  }

  // Sign out function
  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
    // Perform full reload to ensure server-rendered pages see the cleared session
    if (typeof window !== "undefined") {
      window.location.href = "/"
    } else {
      router.push("/")
    }
  }

  useEffect(() => {
    let mounted = true
    if (process.env.NODE_ENV !== 'production') console.log("AuthContext: useEffect mount, creating browser supabase client")

    // Get initial session and allow UI to render immediately.
    ;(async () => {
      if (process.env.NODE_ENV !== 'production') console.log("AuthContext: starting getSession()")
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession()

        if (!mounted) return

        setSession(initialSession ?? null)
        setUser(initialSession?.user ?? null)
        if (process.env.NODE_ENV !== 'production') console.log('AuthContext: initial session/user', { session: initialSession, user: initialSession?.user })

        // Stop blocking the UI while profile is fetched in background
        if (mounted) setLoading(false)

        // Fetch profile in background (do not await)
        if (initialSession?.user) {
          try {
            const userProfile = await fetchUserProfile(initialSession.user.id)
            if (userProfile && userProfile.status_active === false) {
              // sign out disabled user
              try {
                await supabase.auth.signOut()
              } catch (e) {
                console.error('AuthContext: error signing out disabled user (initial)', e)
              }
              if (mounted) {
                setUser(null)
                setSession(null)
                setProfile(null)
              }
            } else {
              if (mounted) setProfile(userProfile)
              if (process.env.NODE_ENV !== 'production') console.log('AuthContext: initial profile (bg)', userProfile)
            }
          } catch (err) {
            console.error('AuthContext: background fetchUserProfile error', err)
          }
        }
      } catch (err) {
        console.error("AuthContext: getSession error", err)
        if (mounted) setLoading(false)
      }
    })()

    // Listen for auth changes and update session/user immediately; fetch profile asynchronously
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      if (process.env.NODE_ENV !== 'production') console.log("AuthContext: onAuthStateChange event, session:", session)

      setSession(session ?? null)
      setUser(session?.user ?? null)
      if (process.env.NODE_ENV !== 'production') console.log('AuthContext: onAuthStateChange set session/user', { session, user: session?.user })

      // Allow UI to render immediately
      if (mounted) setLoading(false)

      if (session?.user) {
        // fetch profile and enforce status_active
        fetchUserProfile(session.user.id)
          .then(async (userProfile) => {
            if (userProfile && userProfile.status_active === false) {
              try {
                await supabase.auth.signOut()
              } catch (e) {
                console.error('AuthContext: error signing out disabled user (onAuthStateChange)', e)
              }
              if (mounted) {
                setUser(null)
                setSession(null)
                setProfile(null)
              }
              return
            }
            if (mounted) setProfile(userProfile)
            if (process.env.NODE_ENV !== 'production') console.log('AuthContext: onAuthStateChange profile (bg)', userProfile)
          })
          .catch((err) => console.error('AuthContext: onAuthStateChange fetchUserProfile error', err))
      } else {
        if (mounted) setProfile(null)
      }
    })

    return () => {
      mounted = false
      try {
        subscription?.unsubscribe()
      } catch (e) {
        // ignore
      }
    }
  }, [])

  useEffect(() => {
    if (profile && profile.role === "admin") {
      try {
        if (typeof window !== "undefined") {
          const currentPath = window.location.pathname
          if (currentPath === "/" || currentPath === "/login" || currentPath === "/register") {
            router.replace("/admin")
          }
        }
      } catch (e) {
        console.error("AuthContext: redirect to /admin failed", e)
      }
    }
  }, [profile, router])
  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

