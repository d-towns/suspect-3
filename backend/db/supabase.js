import { createClient } from "@supabase/supabase-js"
import dotenv from 'dotenv'
dotenv.config()

import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'

export const createSupabaseClient = (context) => {
  return createServerClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    cookies: {
      getAll() {
        return parseCookieHeader(context.req.headers.cookie ?? '')
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          context.res.appendHeader('Set-Cookie', serializeCookieHeader(name, value, {...options, secure: true}))
        )
      },
    },
  })
}