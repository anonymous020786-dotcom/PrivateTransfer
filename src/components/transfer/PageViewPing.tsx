'use client'

import * as React from 'react'

export default function PageViewPing({
  slug,
}: {
  slug: string
}): React.ReactElement {
  React.useEffect(() => {
    void fetch(`/api/transfer/${slug}/view`, { method: 'POST' })
  }, [slug])
  return <></>
}
