import type { Metadata } from 'next'
import Typography from '@mui/material/Typography'
import PageShell from '../../components/PageShell'
import { brand } from '../../brand'

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: `How and why ${brand.name} uses cookies and local storage.`,
  alternates: { canonical: '/cookies' },
}

export default function CookiesPage(): React.ReactElement {
  return (
    <PageShell title="Cookie Policy" updated="June 2026">
      <Typography component="p">
        {brand.name} uses a minimal set of cookies and browser storage to make
        the Service work and remember your preferences. We do not use
        advertising or cross-site tracking cookies.
      </Typography>

      <Typography variant="h2" component="h2">
        Strictly necessary
      </Typography>
      <ul>
        <li>
          <strong>fp_session</strong> — a signed, httpOnly cookie containing a
          random id used for rate limiting and optional accounts. No personal
          data.
        </li>
      </ul>

      <Typography variant="h2" component="h2">
        Preferences (local storage)
      </Typography>
      <ul>
        <li>
          <strong>zync.settings.v1</strong> — your appearance and accessibility
          preferences, stored locally in your browser.
        </li>
        <li>
          <strong>mui-mode</strong> — your light/dark/system color mode choice.
        </li>
        <li>
          <strong>fp_viewer_id</strong> — a random session id used to count
          viewers/downloads on a transfer page.
        </li>
      </ul>

      <Typography variant="h2" component="h2">
        Analytics (optional)
      </Typography>
      <Typography component="p">
        If analytics are enabled by the operator, a privacy-respecting,
        IP-anonymized measurement cookie may be set to understand aggregate
        usage. See our <a href="/privacy">Privacy Policy</a> for details.
      </Typography>

      <Typography variant="h2" component="h2">
        Managing cookies
      </Typography>
      <Typography component="p">
        You can clear cookies and local storage at any time through your browser
        settings. Clearing the preference storage simply resets your
        personalization choices.
      </Typography>

      <Typography variant="h2" component="h2">
        Contact
      </Typography>
      <Typography component="p">
        Questions? Email{' '}
        <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a>.
      </Typography>
    </PageShell>
  )
}
