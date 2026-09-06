import React, { JSX, useState, useCallback, useEffect, useRef } from 'react'
import Backdrop from '@mui/material/Backdrop'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import { extractFileList } from '../fs'

export default function DropZone({
  onDrop,
}: {
  onDrop: (files: File[]) => void
}): JSX.Element {
  const [isDragging, setIsDragging] = useState(false)
  const [fileCount, setFileCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setFileCount(e.dataTransfer?.items.length || 0)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    const currentTarget =
      e.currentTarget === window ? window.document : e.currentTarget
    if (
      e.relatedTarget &&
      currentTarget instanceof Node &&
      currentTarget.contains(e.relatedTarget as Node)
    ) {
      return
    }
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy'
    }
  }, [])

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (e.dataTransfer) {
        const files = await extractFileList(e)
        onDrop(files)
      }
    },
    [onDrop],
  )

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        onDrop(Array.from(e.target.files))
      }
    },
    [onDrop],
  )

  useEffect(() => {
    window.addEventListener('dragenter', handleDragEnter)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('drop', handleDrop)
    return () => {
      window.removeEventListener('dragenter', handleDragEnter)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('drop', handleDrop)
    }
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop])

  return (
    <>
      <Backdrop
        open={isDragging}
        sx={{
          zIndex: (t) => t.zIndex.modal + 1,
          color: '#fff',
          backdropFilter: 'blur(4px)',
          backgroundColor: 'rgba(0,0,0,0.55)',
        }}
      >
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <CloudUploadIcon sx={{ fontSize: 64 }} />
          <Typography variant="h5">
            Drop to select {fileCount} file{fileCount !== 1 ? 's' : ''}
          </Typography>
        </Stack>
      </Backdrop>

      <input
        type="file"
        ref={fileInputRef}
        hidden
        onChange={handleFileInputChange}
        multiple
      />

      <Button
        id="drop-zone-button"
        onClick={handleClick}
        variant="outlined"
        startIcon={<CloudUploadIcon />}
        sx={{
          py: 1.5,
          px: 4,
          borderWidth: 2,
          borderStyle: 'dashed',
          fontWeight: 700,
          '&:hover': { borderWidth: 2 },
        }}
      >
        Drop a file to get started
      </Button>
    </>
  )
}
