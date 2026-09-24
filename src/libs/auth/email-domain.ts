// mahidol.edu / mahidol.ac.th, bare or under any subdomain (student., med., …).
const MAHIDOL_EMAIL = /@([a-z0-9-]+\.)*mahidol\.(edu|ac\.th)$/

export function validateEmailDomain(email: string): boolean {
  return MAHIDOL_EMAIL.test(email.trim().toLowerCase())
}

// Auto-promotion to member is for students only; staff sign in on the wider rule.
export function isStudentEmail(email: string): boolean {
  return /@student\.mahidol\.(edu|ac\.th)$/.test(email.trim().toLowerCase())
}
