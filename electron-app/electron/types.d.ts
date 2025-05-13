declare module 'electron-google-oauth' {
  interface GoogleOAuthOptions {
    clientId: string;
    clientSecret: string;
    scopes: string[];
    redirectUri: string;
  }

  interface GoogleOAuthTokens {
    access_token: string;
    refresh_token: string;
    scope: string;
    token_type: string;
    expiry_date: number;
  }

  export const google: (options: GoogleOAuthOptions) => Promise<GoogleOAuthTokens>;
} 