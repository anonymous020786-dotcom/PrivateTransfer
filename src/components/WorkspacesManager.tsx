'use client'

import * as React from 'react'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Avatar from '@mui/material/Avatar'
import Snackbar from '@mui/material/Snackbar'
import Box from '@mui/material/Box'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import AddIcon from '@mui/icons-material/Add'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import DeleteIcon from '@mui/icons-material/Delete'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import GroupIcon from '@mui/icons-material/Group'
import EditIcon from '@mui/icons-material/Edit'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'

type Member = {
  userId: string
  email: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
}

type TransferStub = {
  slug: string
  title: string
  expiresAt: string
  totalSize: number
}

type Invite = {
  token: string
  email: string
  role: string
  invitedAt: string
  expiresAt: string
}

type Workspace = {
  id: string
  name: string
  ownerId: string
  members: Member[]
  invites: Invite[]
  color: string | null
  createdAt: string
}

function WorkspaceCard({
  ws,
  currentUserId,
  onDeleted,
  onUpdated,
  onSnack,
}: {
  ws: Workspace
  currentUserId: string
  onDeleted: (id: string) => void
  onUpdated: (ws: Workspace) => void
  onSnack: (msg: string) => void
}): React.ReactElement {
  const isOwner = ws.ownerId === currentUserId
  const isAdmin = ws.members.some(
    (m) =>
      m.userId === currentUserId && (m.role === 'owner' || m.role === 'admin'),
  )

  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState('')
  const [inviteRole, setInviteRole] = React.useState<'admin' | 'member'>(
    'member',
  )
  const [inviting, setInviting] = React.useState(false)

  const [editOpen, setEditOpen] = React.useState(false)
  const [editName, setEditName] = React.useState(ws.name)
  const [editColor, setEditColor] = React.useState(ws.color ?? '#6366f1')
  const [saving, setSaving] = React.useState(false)

  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [transfers, setTransfers] = React.useState<TransferStub[] | null>(null)

  React.useEffect(() => {
    fetch('/api/transfer/history')
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          j: Array<{
            slug: string
            title: string
            expiresAt: string
            totalSize: number
            workspaceId?: string | null
          }> | null,
        ) => {
          if (Array.isArray(j))
            setTransfers(j.filter((t) => t.workspaceId === ws.id))
        },
      )
      .catch(() => {})
  }, [ws.id])

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      const res = await fetch(`/api/workspaces/${ws.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      const json = await res.json()
      if (res.ok) {
        onSnack(`Invite sent to ${inviteEmail.trim()}.`)
        setInviteEmail('')
        setInviteOpen(false)
        // Refresh workspace
        const r2 = await fetch(`/api/workspaces/${ws.id}`)
        if (r2.ok) {
          const j2 = await r2.json()
          onUpdated(j2.workspace)
        }
      } else {
        onSnack(json.error ?? 'Failed to send invite.')
      }
    } catch {
      onSnack('Network error.')
    } finally {
      setInviting(false)
    }
  }

  const saveEdit = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/workspaces/${ws.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, color: editColor }),
      })
      const json = await res.json()
      if (res.ok) {
        onUpdated(json.workspace)
        setEditOpen(false)
        onSnack('Workspace updated.')
      } else {
        onSnack(json.error ?? 'Failed to update.')
      }
    } catch {
      onSnack('Network error.')
    } finally {
      setSaving(false)
    }
  }

  const removeMember = async (userId: string, email: string) => {
    try {
      const res = await fetch(`/api/workspaces/${ws.id}/members/${userId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        onUpdated({
          ...ws,
          members: ws.members.filter((m) => m.userId !== userId),
        })
        onSnack(`Removed ${email}.`)
      } else {
        const json = await res.json()
        onSnack(json.error ?? 'Failed to remove member.')
      }
    } catch {
      onSnack('Network error.')
    }
  }

  const deleteWs = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/workspaces/${ws.id}`, { method: 'DELETE' })
      if (res.ok) {
        onDeleted(ws.id)
        onSnack('Workspace deleted.')
      } else {
        const json = await res.json()
        onSnack(json.error ?? 'Failed to delete.')
      }
    } catch {
      onSnack('Network error.')
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  const copyInviteLink = async (token: string) => {
    await navigator.clipboard.writeText(
      `${window.location.origin}/workspaces/join/${token}`,
    )
    onSnack('Invite link copied.')
  }

  const color = ws.color ?? '#6366f1'

  return (
    <Card variant="outlined">
      <CardContent sx={{ pb: 1 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: color, width: 40, height: 40 }}>
              <GroupIcon />
            </Avatar>
            <Stack sx={{ flex: 1 }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, lineHeight: 1.2 }}
              >
                {ws.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {ws.members.length} member{ws.members.length !== 1 ? 's' : ''}
              </Typography>
            </Stack>
            {isAdmin && (
              <IconButton size="small" onClick={() => setEditOpen(true)}>
                <EditIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>

          <Divider />

          {/* Members */}
          <Stack spacing={0.75}>
            {ws.members.map((m) => (
              <Stack
                key={m.userId}
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center', py: 0.5 }}
              >
                <Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>
                  {m.email[0]?.toUpperCase()}
                </Avatar>
                <Typography variant="body2" sx={{ flex: 1 }} noWrap>
                  {m.email}
                </Typography>
                <Chip label={m.role} size="small" variant="outlined" />
                {isAdmin &&
                  m.userId !== currentUserId &&
                  m.role !== 'owner' && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => removeMember(m.userId, m.email)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                {m.userId === currentUserId && m.role !== 'owner' && (
                  <Button
                    size="small"
                    color="error"
                    onClick={() => removeMember(m.userId, m.email)}
                  >
                    Leave
                  </Button>
                )}
              </Stack>
            ))}
          </Stack>

          {/* Pending invites */}
          {ws.invites.length > 0 && (
            <>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Pending invites
              </Typography>
              {ws.invites.map((inv) => (
                <Stack
                  key={inv.token}
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center' }}
                >
                  <Typography
                    variant="body2"
                    sx={{ flex: 1 }}
                    color="text.secondary"
                  >
                    {inv.email}
                  </Typography>
                  <Chip label={inv.role} size="small" variant="outlined" />
                  <IconButton
                    size="small"
                    onClick={() => copyInviteLink(inv.token)}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </>
          )}
        </Stack>
      </CardContent>

      {/* Workspace transfers */}
      {transfers !== null && (
        <CardContent sx={{ pt: 0 }}>
          <Divider sx={{ mb: 1.5 }} />
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', mb: 1 }}
          >
            <FolderOpenIcon fontSize="small" color="action" />
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Transfers ({transfers.length})
            </Typography>
          </Stack>
          {transfers.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              No transfers assigned to this workspace.
            </Typography>
          ) : (
            <Stack spacing={0.5}>
              {transfers.slice(0, 5).map((t) => (
                <Stack
                  key={t.slug}
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center' }}
                >
                  <Typography
                    variant="body2"
                    sx={{ flex: 1, fontWeight: 500 }}
                    noWrap
                  >
                    {t.title || '(untitled)'}
                  </Typography>
                  <IconButton
                    size="small"
                    href={`/transfer/${t.slug}`}
                    component="a"
                    target="_blank"
                  >
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              {transfers.length > 5 && (
                <Typography variant="caption" color="text.secondary">
                  +{transfers.length - 5} more — filter by this workspace in My
                  Transfers.
                </Typography>
              )}
            </Stack>
          )}
        </CardContent>
      )}

      <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
        {isAdmin && (
          <Button
            size="small"
            startIcon={<PersonAddIcon />}
            onClick={() => setInviteOpen(true)}
          >
            Invite
          </Button>
        )}
        {isOwner && (
          <Button
            size="small"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </Button>
        )}
      </CardActions>

      {/* Invite dialog */}
      <Dialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Invite to {ws.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Email address"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              fullWidth
              size="small"
              slotProps={{ htmlInput: { maxLength: 200 } }}
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                label="Role"
                value={inviteRole}
                onChange={(e) =>
                  setInviteRole(e.target.value as 'admin' | 'member')
                }
              >
                <MenuItem value="member">
                  Member — can view shared transfers
                </MenuItem>
                <MenuItem value="admin">Admin — can invite members</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={sendInvite}
            disabled={inviting || !inviteEmail.trim()}
          >
            {inviting ? <CircularProgress size={18} /> : 'Send invite'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Edit workspace</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              fullWidth
              size="small"
              slotProps={{ htmlInput: { maxLength: 80 } }}
            />
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Typography variant="body2">Color</Typography>
              <Box
                component="input"
                type="color"
                value={editColor}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditColor(e.target.value)
                }
                sx={{
                  width: 40,
                  height: 32,
                  border: 'none',
                  borderRadius: 1,
                  cursor: 'pointer',
                  p: 0,
                }}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={saveEdit}
            disabled={saving || !editName.trim()}
          >
            {saving ? <CircularProgress size={18} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete workspace?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This will remove the workspace and all members. Transfers are not
            deleted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={deleteWs}
            disabled={deleting}
          >
            {deleting ? <CircularProgress size={18} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}

export default function WorkspacesManager(): React.ReactElement {
  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = React.useState('')

  const [createOpen, setCreateOpen] = React.useState(false)
  const [newName, setNewName] = React.useState('')
  const [newColor, setNewColor] = React.useState('#6366f1')
  const [creating, setCreating] = React.useState(false)

  const [snack, setSnack] = React.useState('')

  React.useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/workspaces')
        if (res.status === 401) {
          setError('Sign in to manage workspaces.')
          return
        }
        const json = await res.json()
        setWorkspaces(json.workspaces ?? [])
        setCurrentUserId(json.userId ?? '')
      } catch {
        setError('Failed to load workspaces.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const createWorkspace = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      })
      const json = await res.json()
      if (res.ok) {
        setWorkspaces((prev) => [json.workspace, ...prev])
        setCurrentUserId(json.workspace.ownerId)
        setNewName('')
        setCreateOpen(false)
        setSnack('Workspace created.')
      } else {
        setSnack(json.error ?? 'Failed to create workspace.')
      }
    } catch {
      setSnack('Network error.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
      <Stack spacing={4}>
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Stack spacing={0.5}>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              Workspaces
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Collaborate with your team — share transfers and manage members.
            </Typography>
          </Stack>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            New workspace
          </Button>
        </Stack>

        {loading && <CircularProgress size={28} />}
        {error && <Alert severity="warning">{error}</Alert>}

        {!loading && !error && workspaces.length === 0 && (
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2} sx={{ alignItems: 'center', py: 4 }}>
                <GroupIcon sx={{ fontSize: 52, color: 'text.disabled' }} />
                <Typography color="text.secondary">
                  No workspaces yet. Create one to invite your team.
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        )}

        {workspaces.map((ws) => (
          <WorkspaceCard
            key={ws.id}
            ws={ws}
            currentUserId={currentUserId}
            onDeleted={(id) =>
              setWorkspaces((prev) => prev.filter((w) => w.id !== id))
            }
            onUpdated={(updated) =>
              setWorkspaces((prev) =>
                prev.map((w) => (w.id === updated.id ? updated : w)),
              )
            }
            onSnack={setSnack}
          />
        ))}
      </Stack>

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>New workspace</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Workspace name"
              placeholder="My team, Project X…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              fullWidth
              size="small"
              slotProps={{ htmlInput: { maxLength: 80 } }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void createWorkspace()
              }}
            />
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Typography variant="body2">Color</Typography>
              <Box
                component="input"
                type="color"
                value={newColor}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewColor(e.target.value)
                }
                sx={{
                  width: 40,
                  height: 32,
                  border: 'none',
                  borderRadius: 1,
                  cursor: 'pointer',
                  p: 0,
                }}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={createWorkspace}
            disabled={creating || !newName.trim()}
          >
            {creating ? <CircularProgress size={18} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snack}
        autoHideDuration={3500}
        onClose={() => setSnack('')}
        message={snack}
      />
    </Container>
  )
}
