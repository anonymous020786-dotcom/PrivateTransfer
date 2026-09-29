import * as React from 'react'
import type { Metadata } from 'next'
import Box from '@mui/material/Box'
import PageShell from '../../components/PageShell'
import { brand } from '../../brand'

export const metadata: Metadata = {
  title: `Developers & API · ${brand.name}`,
  description: `Upload from the command line, automate cloud transfers, share pastes and verify signed webhooks with the ${brand.name} API.`,
  alternates: { canonical: '/developers' },
}

function Code({ children }: { children: string }): React.ReactElement {
  return (
    <Box
      component="pre"
      sx={{
        p: 2,
        mb: 2.5,
        borderRadius: 2,
        bgcolor: 'action.hover',
        overflowX: 'auto',
        fontSize: 13,
        lineHeight: 1.6,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      }}
    >
      {children}
    </Box>
  )
}

export default function DevelopersPage(): React.ReactElement {
  const host = brand.url.replace(/\/$/, '')
  return (
    <PageShell
      title="Developers & API"
      subtitle="Automate transfers from scripts, CI pipelines and your own apps."
    >
      <h2>Authentication</h2>
      <p>
        Most endpoints work anonymously with guest limits (7-day expiry). Create
        an API key under <strong>Account → API Keys</strong> and send it as a
        bearer token to act as your account: transfers appear in your history,
        can live up to a year, and count toward your storage.
      </p>
      <Code>{`Authorization: Bearer zync_…`}</Code>

      <h2>Upload from the command line</h2>
      <p>
        Stream a file of up to 5 GB with <code>curl -T</code>. The response body
        is the share link followed by a command that deletes the transfer.
      </p>
      <Code>{`curl -T report.pdf ${host}/api/v1/upload/report.pdf

# With options (all optional)
curl -T backup.tar.gz \\
  -H "Authorization: Bearer zync_…" \\
  -H "X-Expires-Days: 30" \\
  -H "X-Max-Downloads: 3" \\
  -H "X-Password: correct-horse" \\
  -H "X-Burn-After-Read: true" \\
  -H "X-Title: Nightly backup" \\
  ${host}/api/v1/upload/backup.tar.gz`}</Code>
      <p>
        The link and delete token are also returned in the{' '}
        <code>X-Transfer-Url</code> and <code>X-Delete-Token</code> headers.
      </p>

      <h2>Cloud transfers (browser-style flow)</h2>
      <p>
        For multiple files or files above 5 GB, use the same three-step flow as
        the web app. Bytes go straight to storage through presigned URLs.
      </p>
      <Code>{`# 1. Create — returns slug, uploadToken, and per-file upload targets
POST /api/transfer/create
{ "files": [{ "name": "a.mp4", "size": 734003200, "type": "video/mp4" }],
  "title": "Rushes", "expiryDays": 14, "password": "optional",
  "webhookUrl": "https://example.com/hooks/zync" }

# 2. Upload — for each file:
#    uploadUrls[i]      → a single PUT of the whole file, or
#    multipart[i]       → { uploadId, partSize, partUrls[] }: PUT each
#                         partSize slice to its URL and keep the ETag header
#                         (X-Zync-ETag on self-hosted local storage)

# 3. Complete — makes the transfer live and sends recipient emails
POST /api/transfer/complete
{ "slug": "…", "uploadToken": "…",
  "multipart": [{ "fileIndex": 0, "parts": [{ "partNumber": 1, "etag": "…" }] }],
  "checksums": ["<sha256 hex of each original file, optional>"] }`}</Code>
      <p>
        Files larger than 100 MB are split into parts automatically. Supplying
        SHA-256 checksums lets recipients verify integrity on the download page.
        Guests delete a transfer with{' '}
        <code>DELETE /api/transfer/&lt;slug&gt;</code> and an{' '}
        <code>x-upload-token</code> header; owners just use their session or
        key.
      </p>

      <h2>Downloads</h2>
      <Code>{`GET  /api/transfer/<slug>                 # public metadata + file list (+ sha256)
POST /api/transfer/<slug>/download        # { "fileIndex": 0, "password": "…" }
                                          # → { "url": "<short-lived signed URL>" }`}</Code>

      <h2>Webhooks</h2>
      <p>
        Transfers with a <code>webhookUrl</code> receive a POST on every
        download (<code>transfer.downloaded</code>) and from the “Send test
        event” button (<code>webhook.test</code>):
      </p>
      <Code>{`POST https://example.com/hooks/zync
X-Zync-Event: transfer.downloaded
X-Zync-Delivery: 6f1c…
X-Zync-Signature: t=1760000000,v1=5d41402abc4b2a76…

{ "id": "6f1c…", "event": "transfer.downloaded", "createdAt": "…",
  "data": { "slug": "…", "downloadCount": 3, "country": "DE", "title": "…" } }`}</Code>
      <p>
        <code>v1</code> is HMAC-SHA256 of <code>{'`${t}.${rawBody}`'}</code>{' '}
        keyed with your signing secret (shown in the transfer’s Webhooks dialog,
        and returned as <code>webhookSecret</code> by create). Reject requests
        whose timestamp is more than five minutes old.
      </p>
      <Code>{`const crypto = require('crypto')
function verify(rawBody, header, secret) {
  const { t, v1 } = Object.fromEntries(header.split(',').map(p => p.split('=')))
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false
  const mac = crypto.createHmac('sha256', secret).update(t + '.' + rawBody).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(v1))
}`}</Code>
      <p>
        Webhook URLs must resolve to public addresses. Every attempt is logged
        with its status code and latency in the transfer’s delivery log.
      </p>

      <h2>Pastes (text & code)</h2>
      <Code>{`POST /api/paste
{ "content": "hello", "language": "text", "expiresIn": 86400,
  "burnAfterRead": false, "password": "optional", "encrypted": false }
→ { "slug": "…", "url": "${host}/paste/…", "deleteToken": "…" }

curl ${host}/api/paste/<slug>/raw          # plain pastes only
POST /api/paste/<slug>/open                # { "password": "…" } → content
DELETE /api/paste/<slug>  -H "x-delete-token: …"`}</Code>
      <p>
        <code>expiresIn</code> is one of 600, 3600, 86400, 604800 or 2592000
        seconds. The web app encrypts pastes in the browser (AES-256-GCM, key in
        the URL fragment); API clients may do the same and send{' '}
        <code>&quot;encrypted&quot;: true</code>.
      </p>

      <h2>Status & limits</h2>
      <Code>{`GET /api/status    # { "status": "ok" | "degraded" | "down", "components": {…} }
                   # HTTP 503 while down — point uptime monitors here`}</Code>
      <p>
        Endpoints are rate limited per IP; responses carry{' '}
        <code>X-RateLimit-*</code> headers and return HTTP 429 when exceeded.
      </p>
    </PageShell>
  )
}
