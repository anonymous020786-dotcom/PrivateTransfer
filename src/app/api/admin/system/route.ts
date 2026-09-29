import { getAdminUser } from '../../../../lib/adminAuth'
import { getSystemStatus } from '../../../../lib/systemStatus'
import { listUsers } from '../../../../local/auth'
import { isLocalBackend } from '../../../../local/mode'
import { ok, err } from '../../../../lib/apiResponse'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await getAdminUser())) return err('Forbidden.', { status: 403 })
  const status = await getSystemStatus({ detailed: true })
  return ok({
    ...status,
    users: isLocalBackend() ? listUsers().length : null,
  })
}
