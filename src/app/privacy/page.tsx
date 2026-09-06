import type { Metadata } from 'next'
import Typography from '@mui/material/Typography'
import PageShell from '../../components/PageShell'
import { brand } from '../../brand'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `How ${brand.name} handles your data. Spoiler: files are peer-to-peer and never stored on our servers.`,
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage(): React.ReactElement {
  return (
    <PageShell title="Privacy Policy" updated="June 2026">
      <Typography component="p">
        Your privacy is the entire point of {brand.name}. This policy explains
        what we collect (very little), what we never collect (your files), and
        the choices you have.
      </Typography>

      <Typography variant="h2" component="h2">
        1. Files are never uploaded to us
      </Typography>
      <Typography component="p">
        {brand.name} transfers files directly between the sender’s browser and
        the recipient’s browser using encrypted WebRTC connections. Your file
        contents never pass through, and are never stored on, our servers. When
        the sender closes their tab, the transfer ends and nothing remains.
      </Typography>

      <Typography variant="h2" component="h2">
        2. What we do process
      </Typography>
      <ul>
        <li>
          <strong>Transfer coordination:</strong> a temporary, randomly
          generated channel slug and a peer ID are held briefly (typically up to
          one hour) so the recipient can find the sender. These contain no file
          data.
        </li>
        <li>
          <strong>Aggregate, anonymous stats:</strong> counts of channels
          created and downloads started, used to display service statistics.
          These are not tied to your identity.
        </li>
        <li>
          <strong>Anonymous session cookie:</strong> a signed, httpOnly cookie
          with a random id to support rate limiting and optional accounts. It
          contains no personal data.
        </li>
        <li>
          <strong>Server logs:</strong> standard request metadata (IP address,
          timestamp, user agent) retained briefly for security and abuse
          prevention.
        </li>
        <li>
          <strong>Contact form:</strong> if you email us or use the contact
          form, we receive the name, email, and message you provide in order to
          respond.
        </li>
      </ul>

      <Typography variant="h2" component="h2">
        3. Cookies & analytics
      </Typography>
      <Typography component="p">
        We use a small number of functional cookies (see our{' '}
        <a href="/cookies">Cookie Policy</a>). If analytics are enabled, we use
        privacy-respecting, IP-anonymized measurement to understand aggregate
        usage. We do not sell your data.
      </Typography>

      <Typography variant="h2" component="h2">
        4. Third parties
      </Typography>
      <Typography component="p">
        Transfers may use public STUN/TURN servers to establish peer connections
        behind firewalls. Optional integrations (authentication, analytics,
        email delivery) are only active when configured by the operator and are
        governed by their own privacy policies.
      </Typography>

      <Typography variant="h2" component="h2">
        5. Your rights
      </Typography>
      <Typography component="p">
        Depending on your jurisdiction (including GDPR and CCPA), you may have
        the right to access, correct, or delete personal data we hold about you.
        Because we store almost nothing, most requests are trivially satisfied.
        Contact us to exercise these rights.
      </Typography>

      <Typography variant="h2" component="h2">
        6. Contact
      </Typography>
      <Typography component="p">
        Questions about privacy? Email{' '}
        <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a>.
      </Typography>
    </PageShell>
  )
}
