import { CollectionConfig } from 'payload'
import { portfolioField } from '../libs/fields/portfolio'
import { contactFields } from '../libs/fields/contacts'
import { tagsOfKind } from '../libs/tags'
import { isSampleField } from '@/libs/sample-data'
// import { isAdmin, isAdminOrSuperadmin, isFieldAdmin, isSelfOrAdmin, isStaff } from '../libs/access' // Replaced by granular permissions
import { User } from '@/payload-types'
import { hasPermission, isPrivilegedGroup, isPrivilegedUser, isSuperadmin } from '../libs/permissions'
import { syncUserGroups } from '../hooks/sync-user-groups'
import { getMissingProfileFields, isProfileComplete } from '../libs/profile-completion'
import { getSiteSettings } from '../libs/site-settings'
import { isStudentEmail } from '../libs/auth/email-domain'

const PRIVILEGED_ROLES = new Set(['admin', 'superadmin'])

const groupId = (group: unknown): string | null => {
  if (typeof group === 'string' || typeof group === 'number') return String(group)
  if (group && typeof group === 'object' && 'id' in group) {
    return String((group as { id: string | number }).id)
  }
  return null
}

async function hasPrivilegedIdentity(payload: any, user: Partial<User>): Promise<boolean> {
  if (user.roles?.some((role) => PRIVILEGED_ROLES.has(role))) return true

  const groups = Array.isArray(user.groups) ? user.groups : []
  if (groups.some((group) => typeof group === 'object' && group && isPrivilegedGroup(group as any))) {
    return true
  }

  const ids = groups.map(groupId).filter((id): id is string => id !== null)
  if (ids.length === 0) return false

  const result = await payload.find({
    collection: 'groups',
    where: { id: { in: ids } },
    limit: ids.length,
    depth: 0,
  })
  return result.docs.some(isPrivilegedGroup)
}


export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    tokenExpiration: 28800, // 8 hours
    useSessions: false,
    cookies: {
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
      // Don't set domain - causes issues on localhost
    },
    forgotPassword: {
      // Payload's default email links to /admin, which doesn't exist for
      // members. Point it at the public reset page instead, and keep it short
      // since we're on Resend's free tier.
      generateEmailSubject: () => 'Reset your password',
      generateEmailHTML: ({ token } = {}) => {
        const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || ''
        const resetUrl = `${serverUrl}/reset-password?token=${token}`
        return `<p>Click the link below to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can ignore this email.</p>`
      },
    },
  },
  admin: {
    useAsTitle: 'email',
    group: 'Admin',
    defaultColumns: ['email', 'roles', 'full_name_thai', 'department'],
    components: {
        beforeListTable: [
          '@/components/payload/BulkAssignLink#BulkAssignLink',
          '@/components/payload/CollectionImportLink#CollectionImportLink',
        ],
    },
  },
  access: {
    // Without this, Payload's default lets any logged-in user (visitor,
    // member, ...) open the /admin panel UI itself, gated only afterward by
    // per-collection read access.
    admin: ({ req: { user } }) => isPrivilegedUser(user as User),
    read: ({ req: { user } }) => {
        if (!user) return false
        if (hasPermission(user as User, 'view_users') || hasPermission(user as User, 'manage_users')) return true
        return {
            id: {
                equals: user.id,
            },
        }
    },
    create: ({ req }) => {
      // OAuth flow sets a context flag
      if (req.context?.isOAuthFlow) return true
      // Admins can create users via admin panel
      if (req.user && hasPermission(req.user as User, 'manage_users')) return true
      return false
    },
    update: ({ req: { user } }) => {
        if (!user) return false
        if (hasPermission(user as User, 'manage_users')) return true
        return {
            id: {
                equals: user.id
            }
        }
    },
    delete: ({ req: { user } }) => hasPermission(user as User, 'manage_users'),
  },
  hooks: {
    beforeOperation: [
      /*
        Payload auto-exposes POST /api/users/forgot-password on any auth
        collection with the local strategy enabled. There is no UI link or
        server action in front of it, so a check anywhere else would never run
        for a direct REST call — this hook is the only thing the request
        passes through. We're on Resend's free tier, so it stays off unless an
        admin turns it on.

        Only `forgotPassword` is gated, and that is a limitation of Payload,
        not an oversight: `resetPassword` never invokes beforeOperation at all
        (see payload/dist/auth/operations/resetPassword.js — it runs only
        beforeValidate, and passes operation: 'update', indistinguishable from
        an ordinary user update). Gating the token's only source is the real
        control, since a reset token can only be obtained through the endpoint
        above. The residual gap is narrow and deliberate: a token issued while
        the toggle was on stays redeemable after it is switched off, until it
        expires.
      */
      async ({ operation }) => {
        if (operation !== 'forgotPassword') return

        let enabled = false
        try {
          enabled = (await getSiteSettings()).enablePasswordReset
        } catch {
          // Fail closed: any unexpected error reading the toggle blocks the
          // operation rather than silently allowing it.
          enabled = false
        }

        if (!enabled) {
          throw new Error('Password reset is currently disabled. Please contact an administrator.')
        }
      },
    ],
    beforeChange: [
      async (args) => {
        const actor = args.req.user as User | null | undefined

        if (!args.req.context?.isOAuthFlow) {
          delete args.data.student_email_verified
          if (
            actor && !hasPermission(actor, 'manage_users') &&
            args.originalDoc && args.data.email && args.data.email !== args.originalDoc.email
          ) {
            throw new Error('Email can only be changed through verified Google sign-in.')
          }
        }

        if (actor && !isSuperadmin(actor)) {
          const target = args.originalDoc as User | undefined
          const editingSelf = target && String(target.id) === String(actor.id)

          if (target && !editingSelf && await hasPrivilegedIdentity(args.req.payload, target)) {
            throw new Error('Only superadmins can change privileged users.')
          }

          if (Array.isArray(args.data?.roles)) {
            const before = new Set(
              (target?.roles || []).filter((role) => PRIVILEGED_ROLES.has(role)),
            )
            const after = new Set(
              args.data.roles.filter((role: string) => PRIVILEGED_ROLES.has(role)),
            )
            if (
              before.size !== after.size ||
              [...before].some((role) => !after.has(role))
            ) {
              throw new Error('Only superadmins can assign admin roles.')
            }
          }

          if (Array.isArray(args.data?.groups)) {
            const before = new Set((target?.groups || []).map(groupId).filter(Boolean))
            const after = new Set(args.data.groups.map(groupId).filter(Boolean))
            const changed = [...new Set([...before, ...after])].filter(
              (id) => before.has(id) !== after.has(id),
            )

            if (changed.length > 0) {
              const groups = await args.req.payload.find({
                collection: 'groups',
                where: { id: { in: changed } },
                limit: changed.length,
                depth: 0,
              })
              if (groups.docs.some(isPrivilegedGroup)) {
                throw new Error('Only superadmins can assign privileged groups.')
              }
            }
          }
        }

        if (
          actor && !hasPermission(actor, 'manage_users') && Array.isArray(args.data?.roles) &&
          JSON.stringify(args.data.roles) !== JSON.stringify(args.originalDoc?.roles || [])
        ) {
          throw new Error('Only user managers can assign roles.')
        }

        const merged = {
          ...(args.originalDoc || {}),
          ...(args.data || {}),
          academic: { ...(args.originalDoc?.academic || {}), ...(args.data?.academic || {}) },
        } as Record<string, unknown>

        const existingRoles = Array.isArray(args.originalDoc?.roles) ? args.originalDoc.roles : []
        // Promote only someone who already is, and stays, a visitor. Payload hands
        // roles back on every update, so a manager demoting a member to visitor
        // shows up as a role change and is left alone.
        const isVisitor = (roles: unknown) => Array.isArray(roles) && roles.length === 1 && roles[0] === 'visitor'
        if (
          isVisitor(existingRoles) && isVisitor(args.data?.roles ?? existingRoles) &&
          (args.req.context?.isOAuthFlow ? args.data.student_email_verified : args.originalDoc?.student_email_verified) === true &&
          isStudentEmail(String(merged.email || '')) &&
          getMissingProfileFields(merged).length === 0
        ) {
          args.data.roles = ['member']
        }

        const incomingRoles = Array.isArray(args.data?.roles) ? args.data.roles : undefined
        const effectiveRoles = incomingRoles ?? existingRoles

        const requiresCompleteProfile = effectiveRoles.some((role: string) => role !== 'visitor')

        if (requiresCompleteProfile) {
          // Existing members may carry legacy gaps (e.g. old-format student IDs),
          // so for them only block a save that blanks a field that was filled.
          const alreadyMissing = existingRoles.some((role: string) => role !== 'visitor')
            ? new Set(getMissingProfileFields((args.originalDoc || {}) as Record<string, unknown>))
            : new Set<string>()
          const missing = getMissingProfileFields(merged).filter((label) => !alreadyMissing.has(label))
          if (missing.length > 0) {
            throw new Error(`Profile is incomplete: ${missing.join(', ')}`)
          }
        }

        if (args.req.context?.skipGroupSync) return args.data
        return syncUserGroups(args)
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        const actor = req.user as User | null | undefined
        if (!actor || isSuperadmin(actor)) return

        const target = await req.payload.findByID({ collection: 'users', id, depth: 0 })
        if (await hasPrivilegedIdentity(req.payload, target)) {
          throw new Error('Only superadmins can delete privileged users.')
        }
      },
    ],
  },
  fields: [
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Visitor', value: 'visitor' },
        { label: 'Member', value: 'member' },
        { label: 'Staff (Probation)', value: 'staff_probation' },
        { label: 'Staff', value: 'staff' },
        { label: 'Deputy VP', value: 'deputy_vp' },
        { label: 'VP', value: 'vp' },
        { label: 'Admin (President)', value: 'admin' },
        { label: 'Superadmin', value: 'superadmin' },
      ],
      defaultValue: ['visitor'],
      admin: {
        description: 'Changing roles auto-syncs the user\'s groups. Admin role is equivalent to President.',
      },
      access: {
        update: ({ req: { user } }) => hasPermission(user as User, 'manage_users'),
      },
      required: true,
    },
    {
      name: 'groups',
      type: 'relationship',
      relationTo: 'groups',
      hasMany: true,
      saveToJWT: true,
      admin: {
        position: 'sidebar',
      },
      access: {
        update: ({ req: { user } }) => hasPermission(user as User, 'manage_users'),
      },
    },
    {
       name: 'department',
       type: 'relationship',
       relationTo: 'tags',
       filterOptions: () => tagsOfKind('department'),
       admin: {
           description: 'Auto-syncs to the group linked to this tag.',
           condition: (data) => {
               if (data?.roles?.includes('staff') || data?.roles?.includes('staff_probation') || data?.roles?.includes('vp')) {
                   return true
               }
               return false
           }
       },
       access: {
           read: () => true,
           update: ({ req: { user } }) => hasPermission(user as User, 'manage_users'),
       }
    },
    {
      name: 'google_id',
      type: 'text',
      access: {
        read: ({ req: { user } }) => isSuperadmin(user as User),
        update: ({ req: { user } }) => isSuperadmin(user as User),
      },
      admin: {
        readOnly: true,
      },
      index: true,
    },
    {
      name: 'student_email_verified',
      type: 'checkbox',
      defaultValue: false,
      admin: { hidden: true, readOnly: true },
      access: {
        create: () => false,
        update: () => false,
      },
    },
    {
        name: 'image_url',
        type: 'text',
        label: 'Profile Picture URL',
        admin: {
            readOnly: true,
        },
    },
    {
      name: 'dob',
      type: 'date',
      label: 'Date of Birth',
    },
    {
        name: 'age',
        type: 'number',
        admin: {
            readOnly: true,
        },
        hooks: {
            beforeChange: [
                ({ siblingData }) => {
                    // remove from DB, make it virtual? Payload virtual fields are hooks afterRead
                    // But here we might want to store it or just calculate on read.
                    // Let's just calculate it.
                    return undefined
                }
            ],
            afterRead: [
                ({ data }) => {
                    if (!data?.dob) return null
                    const dob = new Date(data.dob)
                    const ageDifMs = Date.now() - dob.getTime()
                    const ageDate = new Date(ageDifMs)
                    return Math.abs(ageDate.getUTCFullYear() - 1970)
                }
            ]
        }
    },
    {
      name: 'name_thai',
      type: 'group',
      label: 'Thai Name',
      fields: [
        { name: 'first_name', type: 'text' },
        { name: 'last_name', type: 'text' },
        { name: 'nickname', type: 'text' },
      ],
    },
    // Virtual field for full name
    {
        name: 'full_name_thai',
        type: 'text',
        admin: {
            hidden: true,
        },
        hooks: {
            afterRead: [
                ({ data }) => {
                    if (data?.name_thai?.first_name && data?.name_thai?.last_name) {
                        return `${data.name_thai.first_name} ${data.name_thai.last_name}`
                    }
                    return ''
                }
            ]
        }
    },
    {
      name: 'profile_complete',
      type: 'checkbox',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
      hooks: {
        afterRead: [
          ({ data }) => isProfileComplete(data as User),
        ],
      },
    },
    {
      name: 'name_english',
      type: 'group',
      label: 'English Name',
      fields: [
        { name: 'first_name', type: 'text' },
        { name: 'last_name', type: 'text' },
        { name: 'nickname', type: 'text' },
      ],
    },
    {
      name: 'academic',
      type: 'group',
      label: 'Academic Info',
      fields: [
        {
          name: 'student_id',
          type: 'text',
          required: false,
        },
        {
          name: 'track',
          type: 'relationship',
          relationTo: 'tags',
          filterOptions: () => tagsOfKind('track'),
          admin: {
            description: 'Auto-syncs to the group linked to this tag.',
          },
        },
        {
          name: 'year',
          type: 'relationship',
          relationTo: 'tags',
          filterOptions: () => tagsOfKind('year'),
          admin: {
            description: 'Auto-syncs to the group linked to this tag.',
          },
        },
      ],
    },
    {
      name: 'contact',
      type: 'group',
      fields: contactFields.filter(f => (f as any).name !== 'email'),
    },
    {
        name: 'social_media',
        type: 'array',
        label: 'Social Media',
        labels: { singular: 'Account', plural: 'Accounts' },
        fields: [
            {
              name: 'platform',
              type: 'text',
              required: true,
              label: 'Platform',
              admin: { placeholder: 'e.g. Facebook, Instagram, X, LinkedIn' },
            },
            {
              name: 'handle',
              type: 'text',
              required: true,
              label: 'Handle / URL',
              admin: { placeholder: '@handle or profile URL' },
            },
        ],
    },
    portfolioField,
    {
        /*
          The same vocabulary as `events.event_type` — a member's interests are
          the kinds of session they want. They used to be a second hardcoded
          list that had already drifted from the first ("Event" here vs "Social
          Event" on the event form).
        */
        name: 'interests',
        type: 'relationship',
        relationTo: 'tags',
        hasMany: true,
        filterOptions: () => tagsOfKind('event_type'),
    },
    {
      name: 'notification_preferences',
      type: 'group',
      fields: [
        {
          name: 'email_opt_in',
          type: 'checkbox',
          label: 'Receive Email Notifications',
          defaultValue: true,
        },
      ],
    },
    isSampleField,
  ],
}
