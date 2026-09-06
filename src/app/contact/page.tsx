import type { Metadata } from 'next'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import EmailIcon from '@mui/icons-material/Email'
import PageShell from '../../components/PageShell'
import ContactForm from '../../components/ContactForm'
import { brand } from '../../brand'

export const metadata: Metadata = {
  title: 'Contact',
  description: `Get in touch with the ${brand.name} team by form, email (${brand.contact.email}) or WhatsApp.`,
  alternates: { canonical: '/contact' },
}

export default function ContactPage(): React.ReactElement {
  return (
    <PageShell
      title="Get in touch"
      subtitle="Questions, feedback, or partnership ideas — we’d love to hear from you."
    >
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 7 }}>
          <ContactForm />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={2}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  Prefer something quicker?
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Message us directly — we usually reply within a day.
                </Typography>
                <Stack spacing={1.5}>
                  <Button
                    component="a"
                    href={brand.contact.whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="contained"
                    color="success"
                    startIcon={<WhatsAppIcon />}
                  >
                    WhatsApp +91 {brand.contact.whatsapp}
                  </Button>
                  <Button
                    component="a"
                    href={`mailto:${brand.contact.email}`}
                    variant="outlined"
                    startIcon={<EmailIcon />}
                  >
                    {brand.contact.email}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
            <Box>
              <Typography variant="body2" color="text.secondary">
                {brand.org.legalName} · Operated by {brand.credits.author}.
              </Typography>
            </Box>
          </Stack>
        </Grid>
      </Grid>
    </PageShell>
  )
}
