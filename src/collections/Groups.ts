import { CollectionConfig } from 'payload'
import { hasPermission, isPrivilegedGroup, isSuperadmin } from '../libs/permissions'
import type { User } from '../payload-types'
import { syncGroupMembers } from '../hooks/sync-group-members'

export const Groups: CollectionConfig = {
  slug: 'groups',
  admin: {
    useAsTitle: 'name',
    group: 'Admin',
  },
  access: {
    // Groups must remain readable to every authenticated user because
    // `hasPermission` resolves user → groups → permissions on every auth'd
    // request. Gating this (or the `permissions` field) would break the
    // capability model for non-staff users who rely on group-based perms.
    // Tracked as informational: the bitmask model is visible to any logged-in user.
    read: ({ req: { user } }) => !!user,
    create: ({ req: { user } }) => hasPermission(user as User, 'manage_users'),
    update: ({ req: { user } }) => hasPermission(user as User, 'manage_users'),
    delete: ({ req: { user } }) => hasPermission(user as User, 'manage_users'),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      required: true,
      admin: {
        description: 'Unique identifier for code references (e.g. "admin", "od", "year-1")',
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'System Role', value: 'system' },
        { label: 'Staff Role', value: 'role' },
        { label: 'Department', value: 'department' },
        { label: 'Access', value: 'access' },
      ],
      defaultValue: 'role',
    },
    {
      /*
        The vocabulary row this group mirrors. Departments only: they are both
        a public label (the tag) and a set that grants permissions (the group).

        Year and track used to be here too. They granted nothing, so the group
        was pure duplication of the tag already on the user and has been
        removed — see AUTO_GROUP_TYPES in hooks/sync-user-groups.ts.

        This is the bridge that replaced DEPT_SLUG_MAP / YEAR_SLUG_MAP /
        TRACK_SLUG_MAP in sync-user-groups. A user now holds a tag; the sync
        resolves that tag to whichever group points at it. Adding a department
        is two rows — a tag and a group linked to it — instead of a row plus a
        code change in a hardcoded map.

        Left null on system and role groups. Those are security identities
        (`admin`, `superadmin`), not taxonomy, and deliberately stay driven by
        ROLE_GROUP_SLUGS in code.
      */
      name: 'tag',
      type: 'relationship',
      relationTo: 'tags',
      unique: true,
      admin: {
        position: 'sidebar',
        description: 'Links this group to a Department tag.',
      },
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'permissions',
      type: 'json',
      admin: {
        description: 'Granular permissions configuration',
        components: {
          Field: '@/components/payload/PermissionsField#PermissionsField',
        },
      },
    },
    {
      name: 'members',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      admin: {
        description: 'Use this field to add or remove members from the group.',
        components: {
          Cell: '@/components/MembersCell#MembersCell'
        }
      },
    },
    {
      name: 'members_table',
      type: 'join',
      collection: 'users',
      on: 'groups',
      admin: {
        allowCreate: false,
        defaultColumns: ['email', 'roles', 'department'],
        description: 'Read-only table of all users belonging to this group. Click a row to view the user.',
      },
      defaultLimit: 25,
      defaultSort: 'email',
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc, req: { user } }) => {
        if (!user || isSuperadmin(user as User)) return data

        const next = { ...(originalDoc || {}), ...data }
        if (
          (originalDoc && isPrivilegedGroup(originalDoc)) ||
          isPrivilegedGroup(next)
        ) {
          throw new Error('Only superadmins can create or change privileged groups.')
        }

        return data
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        if (!req.user || isSuperadmin(req.user as User)) return

        const group = await req.payload.findByID({ collection: 'groups', id, depth: 0 })
        if (isPrivilegedGroup(group)) {
          throw new Error('Only superadmins can delete privileged groups.')
        }
      },
    ],
    afterChange: [syncGroupMembers],
  },
}
