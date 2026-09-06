import type { Metadata } from 'next'
import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import { Link as ViewTransitionLink } from 'next-view-transitions'
import PageShell from '../../components/PageShell'
import { TOOLS } from '../../tools/meta'
import { brand } from '../../brand'

export const metadata: Metadata = {
  title: 'Free Online Tools',
  description: `${TOOLS.length} free, private, browser-based utilities from ${brand.name} — password generator, QR codes, hashing, JSON, Base64 and more. Nothing leaves your device.`,
  alternates: { canonical: '/tools' },
}

export default function ToolsPage(): React.ReactElement {
  return (
    <>
      <PageShell
        title="Free browser tools"
        subtitle={`${TOOLS.length} private, no-signup utilities that run entirely in your browser.`}
      />
      <Container maxWidth="lg" sx={{ pb: { xs: 6, md: 8 } }}>
        <Grid container spacing={3}>
          {TOOLS.map((t) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={t.slug}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardActionArea
                  component={ViewTransitionLink}
                  href={`/tools/${t.slug}`}
                  sx={{ height: '100%', alignItems: 'stretch' }}
                >
                  <CardContent>
                    <Box sx={{ fontSize: 34, mb: 1 }}>{t.emoji}</Box>
                    <Chip
                      label={t.category}
                      size="small"
                      variant="outlined"
                      color="primary"
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {t.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </>
  )
}
