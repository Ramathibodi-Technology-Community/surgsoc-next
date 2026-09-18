import { redirect } from 'next/navigation'

// Hall of Fame merged into /team — every year lives on one page behind a
// year picker now, defaulted to the current one. This route stays only so
// old links still resolve.
export default async function TeamPastPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  redirect(`/${locale}/team`)
}
