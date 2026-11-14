import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { nextCookies } from 'better-auth/next-js'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'

/**
 * Better Auth instance — email/password + sessions.
 * Application roles live on `users.role` (input: false).
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      ...schema,
      user: schema.users,
    },
  }),
  emailAndPassword: {
    enabled: true,
    // CMS accounts are provisioned out-of-band — no public registration.
    disableSignUp: true,
  },
  user: {
    additionalFields: {
      role: {
        type: ['admin', 'editor', 'viewer'],
        required: false,
        defaultValue: 'viewer',
        input: false,
      },
      active: {
        type: 'boolean',
        required: false,
        defaultValue: true,
        input: false,
      },
    },
  },
  databaseHooks: {
    session: {
      create: {
        // ponytail: block inactive accounts at session create; CMS also re-checks in authz
        before: async (session) => {
          const [user] = await db
            .select({ active: schema.users.active })
            .from(schema.users)
            .where(eq(schema.users.id, session.userId))
            .limit(1)

          if (user && user.active === false) {
            throw new APIError('FORBIDDEN', {
              message: 'This account is inactive. Contact an administrator.',
            })
          }

          return { data: session }
        },
      },
    },
  },
  advanced: {
    database: {
      generateId: 'uuid',
    },
  },
  // BETTER_AUTH_URL must match the browser origin. Next often bumps ports when
  // 3000 is taken — allow common local origins in development.
  trustedOrigins: [
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ...(process.env.NODE_ENV !== 'production'
      ? [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:3002',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3001',
          'http://127.0.0.1:3002',
        ]
      : []),
  ],
  plugins: [nextCookies()],
})

export type Session = typeof auth.$Infer.Session
