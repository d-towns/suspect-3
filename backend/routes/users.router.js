import { Router } from 'express';
import { createSupabaseClient } from '../db/supabase.js';
import dotenv from 'dotenv';
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { parseCookieHeader } from '@supabase/ssr'

const router = Router();

dotenv.config({path: '../.env'})

const signUpUser = async (req, res) => {
  const { email, password, username } = req.body;
  const supabase = createSupabaseClient({ req, res });

  if (!email || !password || !username) {
    return res.status(400).json({ message: "Please enter all fields" });
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });

    // create a leaderboard entry for the new user
    const { error: leaderboardError } = await supabase
      .from("leaderboard")
      .insert([{ user_id: data.user.id, elo: 1000 }]);

    if (leaderboardError) {
      console.error('Error creating leaderboard entry:', leaderboardError);
    }

    if (error) throw error;
    return res.status(200).json({ message: `User ${email} signed up successfully` });
  } catch (error) {
    return res.status(500).json({ message: `Error signing up user: ${error.message}` });
  }
};

const guestSignIn = async (req, res) => {
  const supabase = createSupabaseClient({ req, res });
  const {username} = req.body;
  const { data, error } = await supabase.auth.signInAnonymously({
    options: {
      data: {
        username,
      },
    }
  })
  if (error) {
    return res.status(500).json({ message: `Error signing in user: ${error.message}` });
  }
  return res.status(200).json({ message: `User signed in successfully`, session: data.session });
}

const loginUser = async (req, res) => {
  console.log('loginUser called');
  const supabase = createSupabaseClient({ req, res });
  console.log('asdfasdfasdfasd called');
  const { email, password, provider } = req.body;


  if (provider == 'none' && (!email || !password )) {
    return res.status(400).json({ message: "Please enter all fields" });
  }

  console.log('asdfasdfasdfasd called');


  
  try {
    if (provider === 'google') {
      const origin = process.env.NODE_ENV === 'dev' ? process.env.BACKEND_URL : process.env.PROD_BACKEND_URL
      console.log('origin:', origin);
      const {data, error} = supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/users/auth/callback`
        },
      })
      console.log('data:', data);

      if (data.url) {
        res.redirect(303, data.url)
      }
      if (error) throw error;
      return res.status(200).json({ message: `User ${email} signed in successfully with google`, session: data.session });
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    return res.status(200).json({ message: `User ${email} signed in successfully`, session: data.session });
    }

  } catch (error) {
    return res.status(500).json({ success: false, message: `Error signing in user: ${error.message}` });
  }
};


const logoutUser = async (req, res) => {
  const supabase = createSupabaseClient({ req, res });
  try {
    const jwt = parseCookieHeader(req.headers.cookie).find(cookie => cookie.name === 'token').value;
    // console.log('jwt:', jwt);
    const { error } = await supabase.auth.signOut(jwt);
    if (error) throw error;
    res.clearCookie('token');
    return res.status(200).json({ success: true, message: "User logged out successfully" });
  } catch (error) {
    
    return res.status(500).json({ success: false, message: `Error logging out user: ${error.message}` });
  }
};

const getUser = async (req, res) => {
  const supabase = createSupabaseClient({ req, res });
  try {
    const jwt = parseCookieHeader(req.headers.cookie).find(cookie => cookie.name === 'token').value;
    console.log('jwt:', jwt);
    const { data: { user }, error } = await supabase.auth.getUser(jwt);
    if (error) throw error;
    return res.status(200).json({ success: true, user: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Error getting user: ${error.message}` });
  }
};

// const getSession = async (req, res) => {
//   console.log('getSession called', req.headers.authorization);
//   const supabase = createSupabaseClient({ req, res });
//   try {
//     const { data: { user }, error: userError } = await supabase.auth.getUser();
//     if (userError) throw userError;
//     const { data: { session }, error: sessionError } = await supabase.auth.getSession();
//     if (sessionError) throw sessionError;
//     return res.status(200).json({ success: true, session: session, user: user });
//   } catch (error) {
//     console.error('Error in getSession:', error);
//     return res.status(401).json({ success: false, message: `Invalid or expired token` });
//   }
// };

router.post("/sign-up", signUpUser);
router.post("/login", loginUser);
router.get("/get-user", getUser);
router.post("/logout", logoutUser);
router.post("/guest-sign-in", guestSignIn);

router.get("/auth/confirm", async function (req, res) {
  const token_hash = req.query.token_hash
  const type = req.query.type
  const next = req.query.next ?? "/"

  if (token_hash && type) {
    const supabase = createSupabaseClient({ req, res })
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    if (!error) {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const filePath = path.join(__dirname, 'views', 'confirmation.html');
      
      fs.readFile(filePath, 'utf8', (err, html) => {
        if (err) {
          console.error('Error reading confirmation HTML:', err);
          return res.status(500).send('Server Error');
        }
        const renderedHtml = html.replace('{{NEXT_URL}}', next);
        res.send(renderedHtml);
      });
      return;
    }


  }

  // return the user to an error page with some instructions
  // res.redirect(303, '/auth/auth-code-error')
})

// router.get("/auth/callback", async function (req, res) {
//   const code = req.query.code
//   const next = req.query.next ?? ''

//   if (code) {
//     const supabase = createSupabaseClient({ req, res })
//     await supabase.auth.exchangeCodeForSession(code)
//   }
//   console.log('redirecting to:', next)
//   res.redirect(303, `${next.slice(1)}`)
// })

export { router as usersRouter };