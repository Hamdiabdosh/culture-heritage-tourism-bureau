import { useId, useRef, useState } from 'react'
import { ApiClientError, uploadMedia } from '../../lib/api-client'
import { useT } from '../../lib/i18n'
import { prepareImageUpload } from '../../lib/prepare-image-upload'

type Props = {
  label: string
  value: string
  onChange: (url: string) => void
  optional?: boolean
  disabled?: boolean
}

/** Pick → upload → preview. Stores the returned /api/media/… URL. */
export function ImageField({ label, value, onChange, optional = true, disabled }: Props) {
  const t = useT('cms.common')
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onPick(file: File | null) {
    if (!file || disabled) return
    // Some OSes omit MIME or use image/jpg — accept by extension too.
    const okType =
      /^image\/(jpeg|jpg|pjpeg|png|webp|gif)$/i.test(file.type) ||
      /\.(jpe?g|png|webp|gif)$/i.test(file.name)
    if (!okType) {
      setError(t('pictureTypeError'))
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setUploading(true)
    setError(null)
    try {
      const prepared = await prepareImageUpload(file)
      const result = await uploadMedia(prepared)
      onChange(result.url)
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : (err as Error).message)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="cms-image-field">
      <span className="cms-image-field-label">
        {label}
        {optional ? (
          <span className="cms-field-opt">{t('optional')}</span>
        ) : (
          <span className="cms-field-req">{t('required')}</span>
        )}
      </span>

      {value ? (
        <div className="cms-image-preview">
          <img src={value} alt="" />
        </div>
      ) : null}

      <div className="cms-image-actions">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".jpg,.jpeg,.jpe,.png,.webp,.gif,image/jpeg,image/jpg,image/pjpeg,image/png,image/webp,image/gif"
          hidden
          disabled={disabled || uploading}
          onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          className="cms-secondary"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? t('uploadingPicture') : value ? t('changePicture') : t('choosePicture')}
        </button>
        {value ? (
          <button
            type="button"
            className="cms-ghost"
            disabled={disabled || uploading}
            onClick={() => {
              onChange('')
              setError(null)
            }}
          >
            {t('removePicture')}
          </button>
        ) : null}
      </div>

      <span className="cms-field-hint">{t('pictureHint')}</span>
      {error ? (
        <p className="cms-form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
