/// <reference lib="webworker" />
import { sha256OfBlob } from '../utils/sha256'

// Hashes files off the main thread so large uploads don't jank the UI.
self.onmessage = async (e: MessageEvent<{ id: number; blob: Blob }>) => {
  const { id, blob } = e.data
  try {
    const hex = await sha256OfBlob(blob)
    self.postMessage({ id, hex })
  } catch (err) {
    self.postMessage({ id, error: (err as Error).message })
  }
}
