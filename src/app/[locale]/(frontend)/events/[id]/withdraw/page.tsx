import { AttendanceDecision } from '../AttendanceDecision'

export default async function WithdrawPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ msg?: string }>
}) {
  const { id } = await params
  const { msg } = await searchParams
  return <AttendanceDecision eventId={id} decision="withdraw" message={msg} />
}
