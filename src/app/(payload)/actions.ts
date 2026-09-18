'use server'

import { handleServerFunctions } from '@payloadcms/next/layouts'
import config from '@payload-config'
import { importMap } from './admin/importMap'
import { ServerFunctionClientArgs } from 'payload'

export async function serverFunction(args: ServerFunctionClientArgs) {
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  })
}
