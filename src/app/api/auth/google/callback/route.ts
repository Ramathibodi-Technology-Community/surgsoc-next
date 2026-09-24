import crypto from 'crypto'
import { exchangeCodeForUser } from '@/libs/auth/google'
import { validateEmailDomain } from '@/libs/auth/email-domain'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import jwt from 'jsonwebtoken'
import { getErrorMessage, safeRedirectPath } from '@/libs/utils'
import { isProfileComplete } from '@/libs/profile-completion'

// OAuth 2.0 / OIDC standard error codes — anything outside this allowlist
// is replaced with a generic code so attacker-controlled error strings
// cannot be reflected into the login URL.
const ALLOWED_OAUTH_ERRORS = new Set([
  'access_denied',
  'invalid_request',
  'unauthorized_client',
  'unsupported_response_type',
  'invalid_scope',
  'server_error',
  'temporarily_unavailable',
  'login_required',
  'consent_required',
  'interaction_required',
])

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    const safeError = ALLOWED_OAUTH_ERRORS.has(error) ? error : 'oauth_error'
    redirect(`/login?error=${safeError}`)
  }

  if (!code || !state) {
    redirect('/login?error=missing_params')
  }

  const cookieStore = await cookies()
  const codeVerifier = cookieStore.get('code_verifier')?.value
  const savedState = cookieStore.get('state')?.value

  if (!codeVerifier || !savedState) {
      redirect('/login?error=missing_session')
  }

  if (state !== savedState) {
      redirect('/login?error=invalid_state')
  }

  try {
    // Exchange code for user info
    const userInfo = await exchangeCodeForUser(
        new URL(request.url), // Use the actual callback URL with all query params
        codeVerifier,
        savedState
    )

    if (!userInfo.email) {
        redirect('/login?error=no_email')
    }

    // Google account holders can set an unverified email on their profile;
    // an unverified address must not be trusted to link/create an account.
    if (userInfo.email_verified !== true) {
        redirect('/login?error=no_email')
    }

    // Validate email domain
    if (!validateEmailDomain(userInfo.email)) {
        redirect('/login?error=invalid_domain')
    }

    const payload = await getPayload({ config })

    // Find existing user
    const { docs: users } = await payload.find({
        collection: 'users',
        where: {
            google_id: { equals: userInfo.sub },
        },
        limit: 1,
    })

    let user = users[0]

    // If no user found by google_id, check by email
    if (!user) {
        const { docs: usersByEmail } = await payload.find({
            collection: 'users',
            where: {
                email: { equals: userInfo.email },
            },
            limit: 1,
        })
        user = usersByEmail[0]

    }

    if (user) {
        // Follow a changed Google email, unless another account already owns it
        // (the unique index would otherwise turn this login into a 500).
        const emailTaken = user.email !== userInfo.email && (await payload.count({
            collection: 'users',
            where: { email: { equals: userInfo.email } },
        })).totalDocs > 0

        user = await payload.update({
            collection: 'users',
            id: user.id,
            data: {
                ...(emailTaken ? {} : { email: userInfo.email }),
                google_id: userInfo.sub,
                image_url: userInfo.picture,
                student_email_verified: true,
            },
            context: { isOAuthFlow: true },
        })
    }

    // specific fallback logic for default logo
    const profilePicture = userInfo.picture || '/assets/logo_surgsoc.jpg'

    // Create new user if not exists
    if (!user) {
        // Prepare name
        const givenName = userInfo.given_name || ''
        const familyName = userInfo.family_name || ''

        user = await payload.create({
            collection: 'users',
            data: {
                email: userInfo.email,
                password: crypto.randomBytes(32).toString('hex'),
                google_id: userInfo.sub,
                student_email_verified: true,
                image_url: profilePicture,
                roles: ['visitor'],
                name_english: {
                    first_name: givenName,
                    last_name: familyName,
                },
                // name_thai and academic fields are now optional
                // The profile completion gate will prompt users to fill them
            } as any,
            context: { isOAuthFlow: true },
        })
    }

    // Generate JWT
    const collectionConfig = payload.collections['users'].config
    const token = jwt.sign(
      {
        email: user.email,
        id: user.id,
        collection: 'users',
      },
      payload.secret,
      {
        expiresIn: collectionConfig.auth.tokenExpiration,
      }
    )

    // Set Payload auth cookie
    cookieStore.set('payload-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: collectionConfig.auth.tokenExpiration,
        sameSite: 'lax',
        // Don't set domain for localhost - let browser handle it
    })

    // Clean up
    const postLoginRedirect = safeRedirectPath(cookieStore.get('post_login_redirect')?.value)
    cookieStore.delete('code_verifier')
    cookieStore.delete('state')
    cookieStore.delete('post_login_redirect')

        // An incomplete profile always wins — finishing it is a prerequisite
        // for whatever the user was originally trying to do.
        if (isProfileComplete(user as any)) {
            redirect(postLoginRedirect)
        }

        redirect('/account?complete=true')

  } catch (err: unknown) {
      // Next.js redirect() throws a special error that should be re-thrown
      if (typeof err === 'object' && err !== null && 'digest' in err) {
          const digest = (err as { digest?: string }).digest
          if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
              throw err
          }
      }
      console.error(`OAuth callback error: ${getErrorMessage(err)}`)
      redirect('/login?error=callback_failed')
  }
}
