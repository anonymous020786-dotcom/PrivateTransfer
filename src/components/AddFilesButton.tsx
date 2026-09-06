import React, { useRef, useCallback, JSX } from 'react'
import Link from '@mui/material/Link'
import { UploadedFile } from '../types'

export default function AddFilesButton({
  onAdd,
}: {
  onAdd: (files: UploadedFile[]) => void
}): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        onAdd(Array.from(e.target.files) as UploadedFile[])
        e.target.value = ''
      }
    },
    [onAdd],
  )

  return (
    <>
      <input
        id="add-files-input"
        type="file"
        ref={fileInputRef}
        hidden
        multiple
        onChange={handleChange}
      />
      <Link
        id="add-files-button"
        component="button"
        type="button"
        onClick={handleClick}
        underline="always"
        color="inherit"
        sx={{ fontSize: 'inherit' }}
      >
        Add more files
      </Link>
    </>
  )
}
