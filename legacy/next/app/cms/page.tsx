import { CmsDashboard } from '@/components/cms-dashboard'
import { getSessionRole, requireSession, canModifyContent } from '@/lib/authz'
import { institution } from '@/lib/institution-config'

export default async function CmsPage() {
  const session = await requireSession('/cms')
  const role = getSessionRole(session)
  const canModify = canModifyContent(role)

  return (
    <CmsDashboard
      userName={session.user.name}
      canModify={canModify}
      institutionName={institution.name}
    />
  )
}
