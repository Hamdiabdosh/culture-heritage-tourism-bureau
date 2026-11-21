import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { CmsLayout } from './components/cms/CmsLayout'
import { PublicShell } from './components/PublicShell'
import { institutionApi, type Institution } from './lib/api-client'
import { AboutPage } from './pages/AboutPage'
import { CmsDashboardPage } from './pages/cms/DashboardPage'
import { CmsEntityEditPage } from './pages/cms/EntityEditPage'
import { CmsEntityListPage } from './pages/cms/EntityListPage'
import { CmsInstitutionSettingsPage } from './pages/cms/InstitutionSettingsPage'
import { CmsNewsEditPage } from './pages/cms/NewsEditPage'
import { CmsNewsListPage } from './pages/cms/NewsListPage'
import { CmsNewsNewPage } from './pages/cms/NewsNewPage'
import { CmsOrgEditPage, CmsOrgListPage } from './pages/cms/OrganizationPages'
import { CmsPagesGuideListPage } from './pages/cms/PagesGuideListPage'
import { CmsPlanEditPage } from './pages/cms/PlanEditPage'
import { CmsUsersPage } from './pages/cms/UsersPage'
import { CmsPageDetailPage } from './pages/CmsPageDetailPage'
import { ContactPage } from './pages/ContactPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { EventDetailPage } from './pages/EventDetailPage'
import { EventsListPage } from './pages/EventsListPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { MapTeaserPage } from './pages/MapTeaserPage'
import { NewsDetailPage } from './pages/NewsDetailPage'
import { NewsListPage } from './pages/NewsListPage'
import { OrganizationPage } from './pages/OrganizationPage'
import { PlanItinerariesPage } from './pages/PlanItinerariesPage'
import { PlanPage } from './pages/PlanPage'
import { ResourceDetailPage } from './pages/ResourceDetailPage'
import { ResourcesListPage } from './pages/ResourcesListPage'
import { ServiceDetailPage } from './pages/ServiceDetailPage'
import { ServicesListPage } from './pages/ServicesListPage'

function NewsSlugRedirect() {
  const { slug } = useParams()
  return <Navigate to={`/stories/${slug ?? ''}`} replace />
}

function ServiceSlugRedirect() {
  const { slug } = useParams()
  return <Navigate to={`/explore/${slug ?? ''}`} replace />
}

export function App() {
  const [institution, setInstitution] = useState<Institution | null>(null)

  useEffect(() => {
    institutionApi.get().then(setInstitution).catch(() => setInstitution(null))
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/cms" element={<CmsLayout />}>
          <Route index element={<CmsDashboardPage />} />
          <Route path="news" element={<CmsNewsListPage />} />
          <Route path="news/new" element={<CmsNewsNewPage />} />
          <Route path="news/:id" element={<CmsNewsEditPage />} />
          <Route path="content" element={<CmsPagesGuideListPage />} />
          <Route path="content/new" element={<Navigate to="/cms/content" replace />} />
          <Route path="content/plan" element={<CmsPlanEditPage />} />
          <Route path="content/:id" element={<CmsEntityEditPage entityKey="pages" mode="edit" />} />
          <Route path="settings" element={<CmsInstitutionSettingsPage />} />
          <Route path="services" element={<CmsEntityListPage entityKey="services" />} />
          <Route
            path="services/new"
            element={<CmsEntityEditPage entityKey="services" mode="create" />}
          />
          <Route
            path="services/:id"
            element={<CmsEntityEditPage entityKey="services" mode="edit" />}
          />
          <Route path="events" element={<CmsEntityListPage entityKey="events" />} />
          <Route path="events/new" element={<CmsEntityEditPage entityKey="events" mode="create" />} />
          <Route path="events/:id" element={<CmsEntityEditPage entityKey="events" mode="edit" />} />
          <Route path="documents" element={<CmsEntityListPage entityKey="documents" />} />
          <Route
            path="documents/new"
            element={<CmsEntityEditPage entityKey="documents" mode="create" />}
          />
          <Route
            path="documents/:id"
            element={<CmsEntityEditPage entityKey="documents" mode="edit" />}
          />
          <Route path="departments" element={<CmsOrgListPage kind="departments" />} />
          <Route path="departments/new" element={<CmsOrgEditPage kind="departments" mode="create" />} />
          <Route path="departments/:id" element={<CmsOrgEditPage kind="departments" mode="edit" />} />
          <Route path="people" element={<CmsOrgListPage kind="people" />} />
          <Route path="people/new" element={<CmsOrgEditPage kind="people" mode="create" />} />
          <Route path="people/:id" element={<CmsOrgEditPage kind="people" mode="edit" />} />
          <Route path="users" element={<CmsUsersPage />} />
        </Route>

        <Route element={<PublicShell institution={institution} />}>
          <Route index element={<HomePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="organization" element={<OrganizationPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="explore" element={<ServicesListPage mode="attractions" />} />
          <Route path="explore/:slug" element={<ServiceDetailPage />} />
          <Route path="experiences" element={<ServicesListPage mode="experiences" />} />
          <Route path="experiences/:slug" element={<ServiceDetailPage />} />
          <Route path="stories" element={<NewsListPage />} />
          <Route path="stories/:slug" element={<NewsDetailPage />} />
          <Route path="plan" element={<PlanPage />} />
          <Route path="plan/itineraries" element={<PlanItinerariesPage />} />
          <Route path="map" element={<MapTeaserPage />} />
          <Route path="events" element={<EventsListPage />} />
          <Route path="events/:slug" element={<EventDetailPage />} />
          <Route path="resources" element={<ResourcesListPage />} />
          <Route path="resources/:slug" element={<ResourceDetailPage />} />
          <Route path="news" element={<Navigate to="/stories" replace />} />
          <Route path="news/:slug" element={<NewsSlugRedirect />} />
          <Route path="services" element={<Navigate to="/explore" replace />} />
          <Route path="services/:slug" element={<ServiceSlugRedirect />} />
          <Route path=":slug" element={<CmsPageDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
