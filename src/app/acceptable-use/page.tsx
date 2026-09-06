import type { Metadata } from 'next'
import Typography from '@mui/material/Typography'
import PageShell from '../../components/PageShell'
import { brand } from '../../brand'

export const metadata: Metadata = {
  title: 'Acceptable Use Policy',
  description: `What you may and may not do when using ${brand.name}.`,
  alternates: { canonical: '/acceptable-use' },
}

export default function AcceptableUsePage(): React.ReactElement {
  return (
    <PageShell title="Acceptable Use Policy" updated="June 2026">
      <Typography component="p">
        {brand.name} is a tool for transferring files you have the right to
        share. This policy describes uses that are not permitted. Because we
        never see your files, enforcement relies on reports — but violations may
        result in a transfer being halted and access being restricted.
      </Typography>

      <Typography variant="h2" component="h2">
        You must not use {brand.name} to
      </Typography>
      <ul>
        <li>
          Share content you do not have the legal right to distribute, including
          pirated or copyright-infringing material.
        </li>
        <li>Distribute malware, viruses, ransomware, or other harmful code.</li>
        <li>
          Share illegal content, including child sexual abuse material (CSAM),
          which we report to the appropriate authorities.
        </li>
        <li>
          Harass, threaten, defame, or violate the privacy or rights of others.
        </li>
        <li>Transmit content that incites violence or unlawful acts.</li>
        <li>
          Attempt to disrupt, overload, reverse-engineer, or abuse the Service
          or its infrastructure.
        </li>
        <li>Circumvent rate limits or security measures.</li>
      </ul>

      <Typography variant="h2" component="h2">
        Reporting abuse
      </Typography>
      <Typography component="p">
        Every download page includes a “Report” option that immediately halts
        the transfer. You can also report abuse to{' '}
        <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a>.
      </Typography>

      <Typography variant="h2" component="h2">
        Enforcement
      </Typography>
      <Typography component="p">
        We may halt transfers, block access, and cooperate with law enforcement
        where we believe this policy has been violated. See our{' '}
        <a href="/terms">Terms of Service</a> and{' '}
        <a href="/dmca">DMCA Policy</a>.
      </Typography>
    </PageShell>
  )
}
