import { Router } from 'express';
import { createSupabaseClient } from '../db/supabase.js';

const router = Router();

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
  const { email, password } = req.body;
  const supabase = createSupabaseClient({ req, res });

  if (!email || !password) {
    return res.status(400).json({ message: "Please enter all fields" });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return res.status(200).json({ message: `User ${email} signed in successfully`, session: data.session });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Error signing in user: ${error.message}` });
  }
};

const logoutUser = async (req, res) => {
  const supabase = createSupabaseClient({ req, res });
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return res.status(200).json({ success: true, message: "User logged out successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Error logging out user: ${error.message}` });
  }
};

const getUser = async (req, res) => {
  const supabase = createSupabaseClient({ req, res });
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
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
// router.get("/get-session", getSession);

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
      res.redirect(303, `/${next.slice(1)}`)
    }
  }

  // return the user to an error page with some instructions
  res.redirect(303, '/auth/auth-code-error')
})

export { router as usersRouter };