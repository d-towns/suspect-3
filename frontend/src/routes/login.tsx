import '../index.css'
// import { useState, useEffect } from 'react'
// import { Session } from '@supabase/supabase-js'
// // import { Auth } from '@supabase/auth-ui-react'
// // import { ThemeSupa } from '@supabase/auth-ui-shared'
// import {supabase} from '../db/supabase-client'


export default function Login() {
  // const [session, setSession] = useState<Session | null>(null)

  // useEffect(() => {
  //   supabase.auth.getSession().then(({ data: { session } }) => {
  //     setSession(session)
  //   })

  //   const {
  //     data: { subscription },
  //   } = supabase.auth.onAuthStateChange((_event, session) => {
  //     setSession(session)
  //   })

  //   return () => subscription.unsubscribe()
  // }, [])

  // if (!session) {
  //   // return (<Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} />)
  //   return (<div>Login</div>)
  // }
  // else {
  //   return (<div>Logged in!</div>)
  // }

  // return (<div>Login</div>)
}