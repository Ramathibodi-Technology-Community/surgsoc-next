import * as client from 'openid-client'

const GOOGLE_ISSUER = 'https://accounts.google.com'

let _config: client.Configuration

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function getGoogleRedirectUri(): string {
  const explicitCallback = process.env.GOOGLE_CALLBACK_URL
  if (explicitCallback) return explicitCallback

  const baseUrl = requireEnv('NEXT_PUBLIC_SERVER_URL')
  return `${baseUrl}/api/auth/google/callback`
}

async function getConfig() {
  if (!_config) {
    _config = await client.discovery(
      new URL(GOOGLE_ISSUER),
      requireEnv('GOOGLE_CLIENT_ID'),
      requireEnv('GOOGLE_CLIENT_SECRET'),
    )
  }
  return _config
}

export async function getAuthorizationUrl() {
  const config = await getConfig()
  const code_challenge_method = 'S256'
  const code_verifier = client.randomPKCECodeVerifier()
  const code_challenge = await client.calculatePKCECodeChallenge(code_verifier)
  const state = client.randomState()

  const parameters: Record<string, string> = {
    redirect_uri: getGoogleRedirectUri(),
    scope: 'openid email profile',
    code_challenge,
    code_challenge_method,
    state,
  }

  const url = client.buildAuthorizationUrl(config, parameters)
  return { url: url.href, code_verifier, state }
}

export async function exchangeCodeForUser(currentUrl: URL, code_verifier: string, state: string) {
  const config = await getConfig()

  const tokens = await client.authorizationCodeGrant(
    config,
    currentUrl,
    {
      pkceCodeVerifier: code_verifier,
      expectedState: state,
      idTokenExpected: true,
    }
  )

  const accessToken = tokens.access_token
  const claims = tokens.claims()
  const subject = claims?.sub
  if (!accessToken) {
    throw new Error('Missing access token from Google')
  }
  if (!subject) {
    throw new Error('Missing subject claim from Google')
  }

  const userInfo = await client.fetchUserInfo(config, accessToken, subject)
  return userInfo
}

export function validateEmailDomain(email: string): boolean {
  if (!email) return false
  return email.endsWith('@mahidol.edu') || email.endsWith('@student.mahidol.edu')
}
