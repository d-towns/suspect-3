import {Router} from 'express';
import {supabase} from '../db/supabase.js';

const router = Router();

const signUpUser = (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ message: "Please enter all fields" });
  }

  // Check for existing user
//   function checkUser(email) {
//     const { data, error } = supabase.from("users").select().eq("email", email);
//     if (error) {
//       return res
//         .status(500)
//         .json({ message: "Error checking for existing user" });
//     }
//     if (data.length > 0) {
//       return res.status(400).json({ message: "User already exists" });
//     }
//   }

//   checkUser(email);
  supabase.auth.signUp({ email, password }).then(({ data, error }) => {
    if (error) {
      return res.status(500).json({ message: "Error signing up user" });
    }
    return res
      .status(200)
      .json({ message: `User ${email} signed up successfully` });
  });
};

router.post("/sign-up", signUpUser);
export {router as usersRouter};