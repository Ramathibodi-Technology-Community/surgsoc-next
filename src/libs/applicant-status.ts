// Single source of truth for registration-status groupings, shared between
// ApplicantPoolManager (frontend) and EventApplicantsTab (admin). Mirrors the
// DB capacity trigger.
export const SEATED_STATUSES = ['accepted', 'confirmed', 'participant']
export const BATCHABLE_STATUSES = ['applicant', 'accepted', 'rejected', 'subscribed']
