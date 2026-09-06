'use client'

import * as React from 'react'
import Container from '@mui/material/Container'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import GroupIcon from '@mui/icons-material/Group'

type ContactGroup = {
  id: string
  name: string
  emails: string[]
  createdAt: string
}

export default function ContactGroupsManager(): React.ReactElement {
  const [groups, setGroups] = React.useState<ContactGroup[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [snack, setSnack] = React.useState('')
  const [createOpen, setCreateOpen] = React.useState(false)
  const [newName, setNewName] = React.useState('')
  const [newEmails, setNewEmails] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/contact-groups')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setGroups(data.groups ?? [])
    } catch {
      setError('Could not load contact groups.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const createGroup = async () => {
    if (!newName.trim()) return
    const emails = newEmails
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e.includes('@'))
    if (emails.length === 0) return
    setSaving(true)
    try {
      const res = await fetch('/api/contact-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), emails }),
      })
      if (!res.ok) throw new Error()
      setSnack('Group created')
      setCreateOpen(false)
      setNewName('')
      setNewEmails('')
      await load()
    } catch {
      setSnack('Failed to create group')
    } finally {
      setSaving(false)
    }
  }

  const deleteGroup = async (id: string) => {
    if (!confirm('Delete this contact group?')) return
    try {
      const res = await fetch(`/api/contact-groups/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setSnack('Group deleted')
      await load()
    } catch {
      setSnack('Failed to delete group')
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 } }}>
      <Stack spacing={3}>
        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Contact groups
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            New group
          </Button>
        </Stack>

        <Typography color="text.secondary">
          Save groups of email addresses so you can quickly select them when
          sending a transfer.
        </Typography>

        {loading && <CircularProgress size={28} />}
        {error && <Alert severity="error">{error}</Alert>}

        {!loading && groups.length === 0 && (
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <GroupIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">
                No contact groups yet. Create one to save a list of recipients.
              </Typography>
            </CardContent>
          </Card>
        )}

        {groups.map((group) => (
          <Card key={group.id} variant="outlined">
            <CardContent>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'flex-start' }}
              >
                <GroupIcon
                  sx={{ color: 'primary.main', mt: 0.25, flexShrink: 0 }}
                />
                <Stack sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {group.name}
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ flexWrap: 'wrap', mt: 0.5 }}
                  >
                    {group.emails.slice(0, 6).map((email) => (
                      <Chip
                        key={email}
                        label={email}
                        size="small"
                        variant="outlined"
                        sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
                      />
                    ))}
                    {group.emails.length > 6 && (
                      <Chip
                        label={`+${group.emails.length - 6} more`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Stack>
                </Stack>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => deleteGroup(group.id)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Create group dialog */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>New contact group</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Group name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              fullWidth
              autoFocus
              slotProps={{ htmlInput: { maxLength: 80 } }}
            />
            <TextField
              label="Email addresses"
              helperText="One per line, or comma/semicolon separated"
              value={newEmails}
              onChange={(e) => setNewEmails(e.target.value)}
              fullWidth
              multiline
              rows={5}
              placeholder="alice@example.com&#10;bob@example.com"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={createGroup}
            disabled={saving || !newName.trim() || !newEmails.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snack}
        autoHideDuration={3000}
        onClose={() => setSnack('')}
        message={snack}
      />
    </Container>
  )
}
