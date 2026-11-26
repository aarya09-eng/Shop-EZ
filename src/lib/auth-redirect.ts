import { supabase } from '@/integrations/supabase/client';

/**
 * After email verification Supabase redirects back with session data in the URL hash.
 * This helper extracts the tokens and restores the session for the current page.
 */
export function handleSupabaseRedirect() {
  const hash = window.location.hash;
  if (!hash) return;

  const params = new URLSearchParams(hash.slice(1)); // remove leading '#'
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (accessToken && refreshToken) {
    // setSession only accepts the two tokens; expiry is read from the access token.
    void supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    // clean the URL so the hash isn’t visible
    window.history.replaceState(null, '', window.location.pathname);
  }
}
