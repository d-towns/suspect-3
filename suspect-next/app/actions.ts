"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const createGameRoomAction = async (data: { userId: string; mode: string }) => {
  const supabase = await createClient();
  const { userId, mode } = data;

  if (!userId) {
    throw new Error('User ID is required to create a room');
  }

  const roomData = {
    host_id: userId,
    created_at: new Date(),
    mode,
  };

  const { data: room, error } = await supabase
    .from('game_rooms')
    .insert([roomData])
    .select()
    .single();

  if (error) {
    console.error('Error creating game room:', error);
    throw new Error(`Error creating game room: ${error.message}`);
  }

  if (data) {
    redirect(`/lobby/${room.id}`);
  }
};

export const getGameRoomsAction = async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('game_rooms')
    .select('*');

  if (error) {
    console.error('Error fetching game rooms:', error);
    throw new Error(`Error fetching game rooms: ${error.message}`);
  }

  return data;
};

export const getRoomAction = async (roomId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('id', roomId)
    .single();

  if (error) {
    console.error('Error fetching game room:', error);
    throw new Error(`Error fetching game room: ${error.message}`);
  }

  if (!data) {
    throw new Error('Game room not found');
  }

  return data;
};

export const signUpForWaitlist = async (formData:FormData) => {
  const response = await fetch('https://api.getwaitlist.com/api/v1/signup', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({
          email: formData.get("email"),
          waitlist_id: 23000
      }),


  }

  )

}

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email and password are required",
    );
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error(error.code + " " + error.message);
    return encodedRedirect("error", "/sign-up", error.message);
  } else {
    return encodedRedirect(
      "success",
      "/sign-up",
      "Thanks for signing up! Please check your email for a verification link.",
    );
  }
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  return redirect("/protected");
};

export const signInWithGoogleAction = async () => {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const { data,  error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options : {
      redirectTo:  `${origin}/auth/callback`,
    }
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  if (data.url) {
    redirect(data.url) // use the redirect API for your server framework
  }
}

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password",
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password update failed",
    );
  }

  encodedRedirect("success", "/protected/reset-password", "Password updated");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
};
