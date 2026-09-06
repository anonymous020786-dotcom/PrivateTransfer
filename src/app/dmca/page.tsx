import type { Metadata } from 'next'
import Typography from '@mui/material/Typography'
import PageShell from '../../components/PageShell'
import { brand } from '../../brand'

export const metadata: Metadata = {
  title: 'DMCA Policy',
  description: `${brand.name}'s copyright and DMCA takedown policy.`,
  alternates: { canonical: '/dmca' },
}

export default function DmcaPage(): React.ReactElement {
  return (
    <PageShell title="DMCA & Copyright Policy" updated="June 2026">
      <Typography component="p">
        {brand.name} respects intellectual property rights. Because files are
        transferred directly between users and are never stored on our servers,
        there is no hosted copy for us to remove. However, we take copyright
        seriously and will act on valid reports.
      </Typography>

      <Typography variant="h2" component="h2">
        How transfers work
      </Typography>
      <Typography component="p">
        A {brand.name} transfer is a live, peer-to-peer connection that exists
        only while the sender keeps their browser open. We cannot remove a file
        that we never possess, but we can disable the temporary channel used to
        coordinate a transfer.
      </Typography>

      <Typography variant="h2" component="h2">
        Submitting a notice
      </Typography>
      <Typography component="p">
        If you believe a transfer infringes your copyright, email{' '}
        <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a> with
        the subject “DMCA Notice” and include:
      </Typography>
      <ul>
        <li>Your contact information.</li>
        <li>Identification of the copyrighted work.</li>
        <li>The transfer link or channel identifier in question.</li>
        <li>
          A statement that you have a good-faith belief the use is unauthorized.
        </li>
        <li>
          A statement, under penalty of perjury, that the information is
          accurate and you are authorized to act.
        </li>
        <li>Your physical or electronic signature.</li>
      </ul>

      <Typography variant="h2" component="h2">
        Counter-notice & repeat infringers
      </Typography>
      <Typography component="p">
        We will disable identified channels promptly and may restrict access for
        repeat infringers. If you believe a channel was disabled in error, you
        may submit a counter-notice to the same address.
      </Typography>
    </PageShell>
  )
}
