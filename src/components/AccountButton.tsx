'use client'

import * as React from 'react'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Avatar from '@mui/material/Avatar'
import Tooltip from '@mui/material/Tooltip'
import { Link as ViewTransitionLink } from 'next-view-transitions'
import { getSupabaseBrowserClient } from '../supabase/client'

export default function AccountButton(): React.ReactElement | null {
  const [state, setState] = React.useState<
    'loading' | 'signed-out' | { avatar: string | null; name: string }
  >('loading')

  React.useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      setState('signed-out')
      return
    }
    let active = true
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return
      const user = data.user
      if (!user) return setState('signed-out')
      const meta = (user.user_metadata || {}) as {
        avatar_url?: string
        full_name?: string
        name?: string
      }
      setState({
        avatar: meta.avatar_url || null,
        name: meta.full_name || meta.name || user.email || 'Account',
      })
    })
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      supabase.auth.getUser().then(({ data }) => {
        if (!active) return
        const user = data.user
        if (!user) return setState('signed-out')
        const meta = (user.user_metadata || {}) as {
          avatar_url?: string
          full_name?: string
          name?: string
        }
        setState({
          avatar: meta.avatar_url || null,
          name: meta.full_name || meta.name || user.email || 'Account',
        })
      })
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // Hide entirely when Supabase isn't configured (avoids a dead "Sign in" link).
  if (!getSupabaseBrowserClient()) return null
  if (state === 'loading') return null

  if (state === 'signed-out') {
    return (
      <Button
        component={ViewTransitionLink}
        href="/login"
        color="inherit"
        sx={{ fontWeight: 600 }}
      >
        Sign in
      </Button>
    )
  }

  return (
    <Tooltip title="Your account">
      <IconButton
        component={ViewTransitionLink}
        href="/account"
        aria-label="Account"
      >
        <Avatar
          src={state.avatar || undefined}
          sx={{ width: 30, height: 30, fontSize: 14 }}
        >
          {state.name[0]?.toUpperCase()}
        </Avatar>
      </IconButton>
    </Tooltip>
  )
}
