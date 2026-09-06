'use client'

import * as React from 'react'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Pagination from '@mui/material/Pagination'
import SearchIcon from '@mui/icons-material/Search'
import { Link as ViewTransitionLink } from 'next-view-transitions'
import type { PostMeta } from '../blog'

const PER_PAGE = 12

export default function BlogIndex({
  posts,
  categories,
}: {
  posts: PostMeta[]
  categories: Array<{ name: string; count: number }>
}): React.ReactElement {
  const [query, setQuery] = React.useState('')
  const [category, setCategory] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(1)

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return posts.filter((p) => {
      if (category && p.category !== category) return false
      if (!q) return true
      return (
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      )
    })
  }, [posts, query, category])

  React.useEffect(() => setPage(1), [query, category])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const current = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{
          alignItems: { md: 'center' },
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles…"
          size="small"
          sx={{ minWidth: { xs: '100%', md: 320 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Typography variant="body2" color="text.secondary">
          {filtered.length} article{filtered.length === 1 ? '' : 's'}
        </Typography>
      </Stack>

      <Stack
        direction="row"
        spacing={1}
        sx={{ flexWrap: 'wrap', gap: 1, mb: 4 }}
      >
        <Chip
          label="All"
          color={category === null ? 'primary' : 'default'}
          variant={category === null ? 'filled' : 'outlined'}
          onClick={() => setCategory(null)}
        />
        {categories.map((c) => (
          <Chip
            key={c.name}
            label={`${c.name} (${c.count})`}
            color={category === c.name ? 'primary' : 'default'}
            variant={category === c.name ? 'filled' : 'outlined'}
            onClick={() => setCategory(c.name)}
          />
        ))}
      </Stack>

      <Grid container spacing={3}>
        {current.map((p) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={p.slug}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardActionArea
                component={ViewTransitionLink}
                href={`/blog/${p.slug}`}
                sx={{ height: '100%', alignItems: 'stretch' }}
              >
                <CardContent>
                  <Chip
                    label={p.category}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ mb: 1.5 }}
                  />
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 700, mb: 1, lineHeight: 1.3 }}
                  >
                    {p.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    {p.excerpt}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(p.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      timeZone: 'UTC',
                    })}{' '}
                    · {p.readingMinutes} min read
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {current.length === 0 && (
        <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
          No articles match your search.
        </Typography>
      )}

      {pageCount > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
          <Pagination
            count={pageCount}
            page={page}
            onChange={(_, v) => {
              setPage(v)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            color="primary"
          />
        </Box>
      )}
    </Box>
  )
}
