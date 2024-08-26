import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";

// Helper function to extract Supabase token from request
export function getSupabaseToken(req) {
  const authHeader = req.headers.authorization;
  let token = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }
  return token;
}

// Helper function to parse cookies if cookie-parser is not used
function parseCookies(cookieHeader) {
  return Object.fromEntries(
    cookieHeader.split("; ").map((cookie) => {
      const [name, ...rest] = cookie.split("=");
      return [name, decodeURIComponent(rest.join("="))];
    }),
  );
}

export function createClient(context) {
  return createServerClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    {
      cookies: {
        getAll() {
          const cookies = parseCookieHeader(context.req.headers.cookie ?? "");
          console.log("getting cookies: ", cookies);
          return cookies;
        },
        setAll(cookiesToSet) {
          console.log("cookiesToSet: ", cookiesToSet);
          cookiesToSet.forEach(({ name, value, options }) =>
            context.res.appendHeader(
              "Cookie",
              serializeCookieHeader(name, value, options),
            ),
          );
        },
      },
    },
  );
}
