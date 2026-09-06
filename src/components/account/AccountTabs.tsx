'use client'

import * as React from 'react'
import Box from '@mui/material/Box'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import LogoutIcon from '@mui/icons-material/Logout'
import AvatarManager from './AvatarManager'
import ProfileForm from './ProfileForm'
import SecurityPanel from './SecurityPanel'
import TransferHistory from './TransferHistory'
import ApiKeysPanel from './ApiKeysPanel'
import CustomDomainManager from '../CustomDomainManager'
import { getSupabaseBrowserClient } from '../../supabase/client'

export default function AccountTabs({
  email,
  name,
  avatarUrl,
  isAdmin,
  metadata,
}: {
  email: string
  name: string
  avatarUrl: string | null
  isAdmin: boolean
  metadata: Record<string, string>
}): React.ReactElement {
  const [tab, setTab] = React.useState(0)

  const signOut = async () => {
    await getSupabaseBrowserClient()?.auth.signOut()
    window.location.href = '/'
  }

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{
          alignItems: { sm: 'center' },
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Your account
          </Typography>
          {isAdmin && <Chip label="Super Admin" color="primary" size="small" />}
        </Stack>
        <Stack direction="row" spacing={1}>
          {isAdmin && (
            <Button href="/admin" variant="text">
              Admin
            </Button>
          )}
          <Button
            onClick={signOut}
            variant="outlined"
            color="inherit"
            startIcon={<LogoutIcon />}
          >
            Sign out
          </Button>
        </Stack>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {email}
      </Typography>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
      >
        <Tab label="Profile" />
        <Tab label="History" />
        <Tab label="Security" />
        <Tab label="API Keys" />
        <Tab label="Custom Domain" />
      </Tabs>

      {tab === 0 && (
        <Box>
          <Box sx={{ mb: 4 }}>
            <AvatarManager initialUrl={avatarUrl} name={name} />
          </Box>
          <Divider sx={{ mb: 4 }} />
          <ProfileForm initial={metadata} />
        </Box>
      )}

      {tab === 1 && <TransferHistory />}

      {tab === 2 && (
        <SecurityPanel
          email={email}
          initialBackupEmail={metadata.backup_email || ''}
        />
      )}

      {tab === 3 && <ApiKeysPanel />}
      {tab === 4 && <CustomDomainManager />}
    </Box>
  )
}
