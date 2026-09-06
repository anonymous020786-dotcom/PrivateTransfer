'use client'

import * as React from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadForOfflineOutlined'

type PostRow = {
  id: string
  slug: string
  title: string
  category: string
  date: string
  published: boolean
}

type Editing = {
  slug: string
  title: string
  category: string
  excerpt: string
  author: string
  tags: string
  content: string
  published: boolean
  isNew: boolean
}

const EMPTY: Editing = {
  slug: '',
  title: '',
  category: 'General',
  excerpt: '',
  author: 'Zync Team',
  tags: '',
  content: '',
  published: true,
  isNew: true,
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function BlogManager(): React.ReactElement {
  const [posts, setPosts] = React.useState<PostRow[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [editing, setEditing] = React.useState<Editing | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [saveErr, setSaveErr] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setError(null)
    const res = await fetch('/api/admin/posts', { cache: 'no-store' })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to load posts.')
      setPosts([])
      return
    }
    setPosts(data.posts ?? [])
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  const importStatic = async () => {
    setBusy(true)
    setError(null)
    const res = await fetch('/api/admin/posts/import', { method: 'POST' })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) {
      setError(data.error || 'Import failed.')
      return
    }
    await load()
  }

  const openNew = () => {
    setSaveErr(null)
    setEditing({ ...EMPTY })
  }

  const openEdit = async (slug: string) => {
    setSaveErr(null)
    // fetch full content from the public source via the admin list we have +
    // the post API isn't needed; load content from the blog page data:
    const res = await fetch(
      `/api/admin/posts?full=${encodeURIComponent(slug)}`,
      { cache: 'no-store' },
    ).catch(() => null)
    // Fallback: load from the published JSON endpoint not available; use minimal.
    const row = posts?.find((p) => p.slug === slug)
    let full: Partial<Editing> = {}
    if (res && res.ok) {
      const d = await res.json().catch(() => ({}))
      if (d.post) full = d.post
    }
    setEditing({
      slug,
      title: full.title ?? row?.title ?? '',
      category: full.category ?? row?.category ?? 'General',
      excerpt: full.excerpt ?? '',
      author: full.author ?? 'Zync Team',
      tags: full.tags ?? '',
      content: full.content ?? '',
      published: full.published ?? row?.published ?? true,
      isNew: false,
    })
  }

  const save = async () => {
    if (!editing) return
    setSaving(true)
    setSaveErr(null)
    const body = {
      slug: editing.slug || slugify(editing.title),
      title: editing.title,
      category: editing.category,
      excerpt: editing.excerpt,
      author: editing.author,
      tags: editing.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      content: editing.content,
      published: editing.published,
    }
    const res = await fetch('/api/admin/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      setSaveErr(data.error || 'Save failed.')
      return
    }
    setEditing(null)
    await load()
  }

  const remove = async (slug: string) => {
    if (!confirm(`Delete "${slug}"? This cannot be undone.`)) return
    setPosts((p) => p?.filter((x) => x.slug !== slug) ?? null)
    await fetch(`/api/admin/posts?slug=${encodeURIComponent(slug)}`, {
      method: 'DELETE',
    }).catch(() => {})
  }

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Blog posts {posts ? `(${posts.length})` : ''}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Import all built-in static posts into the database">
            <span>
              <Button
                onClick={importStatic}
                disabled={busy}
                startIcon={
                  busy ? (
                    <CircularProgress size={16} />
                  ) : (
                    <DownloadOutlinedIcon />
                  )
                }
                variant="outlined"
                size="small"
              >
                Import static posts
              </Button>
            </span>
          </Tooltip>
          <Button
            onClick={openNew}
            startIcon={<AddIcon />}
            variant="contained"
            size="small"
          >
            New post
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error} {error.includes('posts') && '— run supabase/posts.sql first.'}
        </Alert>
      )}

      {posts === null ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : posts.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No posts yet. Click “Import static posts” to migrate the built-in
          articles, or “New post”.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {posts.map((p) => (
            <Card key={p.id} variant="outlined">
              <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ alignItems: 'center' }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="subtitle2"
                      noWrap
                      sx={{ fontWeight: 700 }}
                    >
                      {p.title}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ mt: 0.5, flexWrap: 'wrap' }}
                    >
                      <Chip size="small" label={p.category} />
                      {!p.published && (
                        <Chip size="small" color="warning" label="Draft" />
                      )}
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ alignSelf: 'center' }}
                      >
                        /{p.slug}
                      </Typography>
                    </Stack>
                  </Box>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => openEdit(p.slug)}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => remove(p.slug)}>
                      <DeleteOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{editing?.isNew ? 'New post' : 'Edit post'}</DialogTitle>
        <DialogContent dividers>
          {editing && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              {saveErr && <Alert severity="error">{saveErr}</Alert>}
              <TextField
                label="Title"
                fullWidth
                value={editing.title}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    title: e.target.value,
                    slug: editing.isNew
                      ? slugify(e.target.value)
                      : editing.slug,
                  })
                }
              />
              <TextField
                label="Slug"
                fullWidth
                value={editing.slug}
                onChange={(e) =>
                  setEditing({ ...editing, slug: e.target.value })
                }
                helperText="lowercase-with-dashes"
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Category"
                  fullWidth
                  value={editing.category}
                  onChange={(e) =>
                    setEditing({ ...editing, category: e.target.value })
                  }
                />
                <TextField
                  label="Author"
                  fullWidth
                  value={editing.author}
                  onChange={(e) =>
                    setEditing({ ...editing, author: e.target.value })
                  }
                />
              </Stack>
              <TextField
                label="Tags (comma separated)"
                fullWidth
                value={editing.tags}
                onChange={(e) =>
                  setEditing({ ...editing, tags: e.target.value })
                }
              />
              <TextField
                label="Excerpt"
                fullWidth
                multiline
                minRows={2}
                value={editing.excerpt}
                onChange={(e) =>
                  setEditing({ ...editing, excerpt: e.target.value })
                }
              />
              <TextField
                label="Content (Markdown)"
                fullWidth
                multiline
                minRows={12}
                value={editing.content}
                onChange={(e) =>
                  setEditing({ ...editing, content: e.target.value })
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={editing.published}
                    onChange={(e) =>
                      setEditing({ ...editing, published: e.target.checked })
                    }
                  />
                }
                label="Published"
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button
            onClick={save}
            variant="contained"
            disabled={saving || !editing?.title}
          >
            {saving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
