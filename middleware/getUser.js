// middleware/auth.js
import { createClient } from "../db/supabase.js";

export const getUser = async (req, res, next) => {
  const supabase = createClient({ req, res });
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    console.log("No authorization token provided");
    req.user = null;
    return next();
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      if (error.__isAuthError) {
        console.log("Authentication error: missing or invalid session");
      } else {
        console.log("Error retrieving user data:", error);
      }
      req.user = null;
    } else if (!data.user) {
      console.log("No user data returned");
      req.user = null;
    } else {
      req.user = data.user;
    }
  } catch (error) {
    console.error("Unexpected error during authentication:", error);
    req.user = null;
  }
  return next();
};
