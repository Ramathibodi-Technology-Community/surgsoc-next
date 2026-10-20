import { redirect } from 'next/navigation'

// The edit page is the form's home now (header, tabs, responses, assignment); the old hub only forwarded there.
export default async function ManageForm({ params, searchParams }: { params: Promise<{ formId: string }>; searchParams: Promise<{ returnTo?: string }> }) {
  const { formId } = await params
  const { returnTo } = await searchParams
  redirect(`/forms/${formId}/edit${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`)
}
