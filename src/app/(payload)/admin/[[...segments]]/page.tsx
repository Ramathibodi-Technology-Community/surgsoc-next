
import config from '@payload-config'
import { RootPage } from '@payloadcms/next/views'
import { importMap } from './importMap'
import { connection } from 'next/server'


type Args = {
  params: Promise<{
    segments: string[]
  }>
  searchParams: Promise<{
    [key: string]: string | string[]
  }>
}

// Same reasoning as the (payload) layout: every admin view reads `new Date()`
// while authenticating the session, which cacheComponents refuses to
// prerender. The layout's own `connection()` call doesn't cover this segment
// independently, so opt this page out too rather than fight the check.
export const instant = false

const Page = async ({ params, searchParams }: Args) => {
  await connection()
  return <RootPage config={config} params={params} searchParams={searchParams} importMap={importMap} />
}

export default Page
