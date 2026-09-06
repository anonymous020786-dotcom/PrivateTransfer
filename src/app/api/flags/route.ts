import { NextResponse } from 'next/server'
import { isFeatureEnabled } from '../../../lib/appSettings'
import { ok } from '../../../lib/apiResponse'

export const dynamic = 'force-dynamic'

// Public endpoint — returns only boolean UI-relevant feature flags.
// No secrets, no admin auth required.
export async function GET(): Promise<NextResponse> {
  const [cloudTransfers, guestUploads, registration] = await Promise.all([
    isFeatureEnabled('feature_cloud_transfers', true),
    isFeatureEnabled('feature_guest_uploads', true),
    isFeatureEnabled('feature_registration', true),
  ])

  return ok({ cloudTransfers, guestUploads, registration })
}
