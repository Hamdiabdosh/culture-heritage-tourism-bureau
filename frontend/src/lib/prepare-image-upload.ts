/** Max longest edge after conversion (keeps CMS uploads light). */
const MAX_EDGE = 2000
const JPEG_QUALITY = 0.85

/**
 * Resize + convert to JPEG in the browser before upload.
 * Handles large camera JPEGs and odd desktop MIME labels without server tooling.
 */
export async function prepareImageUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|gif)$/i.test(file.name)) {
    return file
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file

    // JPEG has no alpha — white fill so transparent PNGs don’t go black.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    })
    if (!blob) return file

    const base = file.name.replace(/\.[^.]+$/, '') || 'picture'
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
  } finally {
    bitmap.close()
  }
}
