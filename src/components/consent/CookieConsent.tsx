'use client'

import * as React from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import Slide from '@mui/material/Slide'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import CookieIcon from '@mui/icons-material/Cookie'
import { useConsent } from './ConsentContext'

// Professional cookie-consent banner with Accept / Reject / Customize, plus a
// granular customize dialog. Choice is persisted and gates Google Analytics.
export default function CookieConsent(): React.ReactElement | null {
  const { bannerOpen, save } = useConsent()
  const [customize, setCustomize] = React.useState(false)
  const [analytics, setAnalytics] = React.useState(true)

  if (!bannerOpen && !customize) return null

  return (
    <>
      <Slide
        direction="up"
        in={bannerOpen && !customize}
        mountOnEnter
        unmountOnExit
      >
        <Paper
          elevation={8}
          role="dialog"
          aria-label="Cookie consent"
          sx={{
            position: 'fixed',
            bottom: { xs: 0, sm: 16 },
            left: { xs: 0, sm: '50%' },
            transform: { sm: 'translateX(-50%)' },
            width: { xs: '100%', sm: 'auto' },
            maxWidth: 720,
            p: 2.5,
            zIndex: (t) => t.zIndex.snackbar + 1,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: { xs: 0, sm: 3 },
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ alignItems: { md: 'center' } }}
          >
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ alignItems: 'flex-start', flex: 1 }}
            >
              <CookieIcon color="primary" />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  We value your privacy
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  We use only essential cookies to run Zync, plus optional
                  analytics to improve it. See our{' '}
                  <Link href="/cookies">Cookie Policy</Link>.
                </Typography>
              </Box>
            </Stack>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ flexShrink: 0 }}
            >
              <Button size="small" onClick={() => setCustomize(true)}>
                Customize
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => save(false)}
              >
                Reject all
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={() => save(true)}
              >
                Accept all
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Slide>

      <Dialog
        open={customize}
        onClose={() => setCustomize(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Cookie preferences</DialogTitle>
        <DialogContent>
          <FormControlLabel
            control={<Switch checked disabled />}
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Strictly necessary
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Required for sign-in, security and core functionality. Always
                  on.
                </Typography>
              </Box>
            }
          />
          <FormControlLabel
            sx={{ mt: 1 }}
            control={
              <Switch
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
              />
            }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Analytics
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Privacy-respecting, IP-anonymized usage measurement.
                </Typography>
              </Box>
            }
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              save(false)
              setCustomize(false)
            }}
          >
            Reject all
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              save(analytics)
              setCustomize(false)
            }}
          >
            Save preferences
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
