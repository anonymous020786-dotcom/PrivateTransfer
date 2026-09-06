import type { Metadata } from 'next'
import Typography from '@mui/material/Typography'
import PageShell from '../../components/PageShell'
import { brand } from '../../brand'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `The terms governing your use of ${brand.name}.`,
  alternates: { canonical: '/terms' },
}

export default function TermsPage(): React.ReactElement {
  return (
    <PageShell title="Terms of Service" updated="June 2026">
      <Typography component="p">
        By using {brand.name} (the “Service”), you agree to these Terms. If you
        do not agree, please do not use the Service.
      </Typography>

      <Typography variant="h2" component="h2">
        1. The Service
      </Typography>
      <Typography component="p">
        {brand.name} provides peer-to-peer file transfer in your browser. Files
        move directly between users; we do not host, store, or inspect file
        contents. The Service is provided free of charge and “as is”.
      </Typography>

      <Typography variant="h2" component="h2">
        2. Acceptable use
      </Typography>
      <Typography component="p">
        You agree to use the Service lawfully and in accordance with our{' '}
        <a href="/acceptable-use">Acceptable Use Policy</a>. You are solely
        responsible for the files you transfer and for ensuring you have the
        right to share them.
      </Typography>

      <Typography variant="h2" component="h2">
        3. No warranty
      </Typography>
      <Typography component="p">
        The Service is provided without warranties of any kind. Transfers depend
        on network conditions and both parties keeping their browsers open. We
        do not guarantee availability, delivery, or that the Service will be
        error-free.
      </Typography>

      <Typography variant="h2" component="h2">
        4. Limitation of liability
      </Typography>
      <Typography component="p">
        To the maximum extent permitted by law, {brand.org.legalName} and{' '}
        {brand.name} shall not be liable for any indirect, incidental, or
        consequential damages arising from your use of the Service.
      </Typography>

      <Typography variant="h2" component="h2">
        5. Termination
      </Typography>
      <Typography component="p">
        We may suspend or terminate access to the Service, including halting
        specific transfers, where we reasonably believe these Terms or the
        Acceptable Use Policy have been violated.
      </Typography>

      <Typography variant="h2" component="h2">
        6. Changes
      </Typography>
      <Typography component="p">
        We may update these Terms from time to time. Continued use after changes
        constitutes acceptance of the revised Terms.
      </Typography>

      <Typography variant="h2" component="h2">
        7. Contact
      </Typography>
      <Typography component="p">
        Questions? Email{' '}
        <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a>.
      </Typography>
    </PageShell>
  )
}
