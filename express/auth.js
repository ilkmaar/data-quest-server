import { createClient } from '../db/supabase.js';
import { REDIRECT_URL } from '../config.js';

export const authRoutes = (app) => {
  app.get('/auth/callback', async (req, res) => {
    const { code, next = '/' } = req.query;
    if (code) {
      const supabase = createClient({ req, res });
      await supabase.auth.exchangeCodeForSession(code);
    }
    res.redirect(303, `${REDIRECT_URL}`);
  });

  app.post('/auth/logout', async (req, res) => {
    const supabase = createClient({ req, res });
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
      return res.status(500).send('Error logging out');
    }
    res.json({ success: true });
  });
};
