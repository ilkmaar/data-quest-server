// middleware/auth.js
import { createClient } from "../db/supabase.js";

export const getUser = async (req, res, next) => {
  const supabase = createClient({ req, res });
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      if (error.__isAuthError) {
        // Handle missing auth session without logging an error
        req.user = null;
      } else {
        // Log other types of errors
        console.log("Error getting user:", error);
        req.user = null;
      }
    } else {
      req.user = data.user;
    }
  } catch (error) {
    console.error("Unexpected error getting user:", error);
    req.user = null;
  }

  next();
};
