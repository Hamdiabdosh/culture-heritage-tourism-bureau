/**
 * Platform-level settings for the reusable government website template.
 * Not institution-specific — swap institution-config per office.
 */
export const platformConfig = {
  name: 'Government Website Platform',
  description: 'Reusable platform for Ethiopian government websites',
  version: '1.0.0',
} as const

export type PlatformConfig = typeof platformConfig
