'use client'

import * as React from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Box from '@mui/material/Box'
import { CopyableInput } from '../CopyableInput'

type Delivery = {
  id: string
  event: string
  at: string
  status: number | null
  ok: boolean
  durationMs: number
  error?: string
}

type Info = {
  webhookUrl: string | null
  slackWebhookUrl: string | null
  signingSecret: string
  deliveries: Delivery[]
}

const VERIFY_SNIPPET = `// Node.js: verify X-Zync-Signature ("t=<unix>,v1=<hex>")
const crypto = require('crypto')
function verify(rawBody, header, secret) {
  const { t, v1 } = Object.fromEntries(header.split(',').map(p => p.split('=')))
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false // replay window
  const mac = crypto.createHmac('sha256', secret).update(t + '.' + rawBody).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(v1))
}`

export default function WebhookDialog({
  slug,
  open,
  onClose,
}: {
  slug: string
  open: boolean
  onClose: () => void
}): React.ReactElement {
  const [info, setInfo] = React.useState<Info | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [testing, setTesting] = React.useState(false)

  const load = React.useCallback(async () => {
    setError(null)
    try {
      const res = await fetch(`/api/transfer/${slug}/webhooks`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not load webhooks.')
      setInfo(json)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [slug])

  React.useEffect(() => {
    if (open) void load()
  }, [open, load])

  const sendTest = async () => {
    setTesting(true)
    setError(null)
    try {
      const res = await fetch(`/api/transfer/${slug}/webhooks`, {
        method: 'POST',
      })
      const json = await res.json()
      if (!res.ok) setError(json.error || 'Test delivery failed.')
      await load()
    } finally {
      setTesting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Webhooks</DialogTitle>
      <DialogContent>
        {!info && !error && <CircularProgress size={24} />}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {info && (
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Endpoint
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                {info.webhookUrl ||
                  'No webhook URL set — add one in the transfer settings.'}
              </Typography>
              {info.slackWebhookUrl && (
                <Typography variant="caption" color="text.secondary">
                  Slack notifications are also enabled.
                </Typography>
              )}
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Signing secret
              </Typography>
              <CopyableInput
                label="Signing secret"
                value={info.signingSecret}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                component="div"
                sx={{ mt: 1 }}
              >
                Each request carries <code>X-Zync-Signature: t=…,v1=…</code>, an
                HMAC-SHA256 of <code>{'`${t}.${body}`'}</code> using this
                secret.
              </Typography>
              <Box
                component="pre"
                sx={{
                  mt: 1,
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                  fontSize: 12,
                  overflowX: 'auto',
                }}
              >
                {VERIFY_SNIPPET}
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Recent deliveries
              </Typography>
              {info.deliveries.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No deliveries yet. Webhooks fire on every download.
                </Typography>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Event</TableCell>
                        <TableCell>Result</TableCell>
                        <TableCell align="right">Time</TableCell>
                        <TableCell>When</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {info.deliveries.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell>{d.event}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              color={d.ok ? 'success' : 'error'}
                              label={d.status ?? d.error ?? 'failed'}
                              title={d.error}
                            />
                          </TableCell>
                          <TableCell align="right">{d.durationMs} ms</TableCell>
                          <TableCell>
                            {new Date(d.at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          onClick={sendTest}
          disabled={testing || !info?.webhookUrl}
        >
          {testing ? 'Sending…' : 'Send test event'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
