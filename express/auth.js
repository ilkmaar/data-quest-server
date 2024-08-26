import { createClient } from "../db/supabase.js";

export const authRoutes = (app) => {
  app.post("/auth/callback", async (req, res) => {

    const { code, codeVerifier } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Authorization code is missing" });
    }

    const supabase = createClient({ req, res });
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession({
        code: code,
        code_verifier: codeVerifier,
      });

      if (error) {
        console.error("Error exchanging code for session:", error.message);
        return res
          .status(500)
          .json({ error: "Error exchanging code for session" });
      }

      console.log("Session exchange successful");
      res.json({ data });
    } catch (error) {
      console.error("Unexpected error during session exchange:", error);
      res
        .status(500)
        .json({ error: "Unexpected error during session exchange" });
    }
  });

  app.post("/auth/logout", async (req, res) => {
    const supabase = createClient({ req, res });
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
      return res.status(500).send("Error logging out");
    }
    res.json({ success: true });
  });
};
