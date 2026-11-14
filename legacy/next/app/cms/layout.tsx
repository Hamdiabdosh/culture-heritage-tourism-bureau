import './cms.css'
import { CmsShell } from '@/components/cms-shell'
import { getSessionRole, requireSession } from '@/lib/authz'
import { institution } from '@/lib/institution-config'

export default async function CmsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession('/cms')
  const role = getSessionRole(session)

  return (
    <CmsShell
      userName={session.user.name}
      role={role}
      institutionName={institution.name}
      institutionShortName={institution.shortName}
    >
      {children}
    </CmsShell>
  )
}
