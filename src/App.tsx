import { Navigate, Route, Routes } from 'react-router-dom'
import Footer from './components/Footer'
import Header from './components/Header'
import Toaster from './components/ui/Toaster'
import AdminPage from './pages/AdminPage'
import CompliancePage from './pages/CompliancePage'
import CurriculumPage from './pages/CurriculumPage'
import FieldPage from './pages/FieldPage'
import HomePage from './pages/HomePage'
import ReportPage from './pages/ReportPage'
import RoadmapPage from './pages/RoadmapPage'
import StudentPage from './pages/StudentPage'
import TagsPrintPage from './pages/TagsPrintPage'
import TeacherPage from './pages/TeacherPage'

function AppLayout() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main className="main" id="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/field" element={<FieldPage />} />
          <Route path="/learn/teacher" element={<TeacherPage />} />
          <Route path="/learn/student" element={<StudentPage />} />
          <Route path="/curriculum" element={<CurriculumPage />} />
          <Route path="/compliance" element={<CompliancePage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <>
      <Routes>
        {/* Print pages have no header or footer. */}
        <Route path="/print/tags/:shipmentId" element={<TagsPrintPage />} />
        <Route path="/admin/report" element={<ReportPage />} />
        <Route path="*" element={<AppLayout />} />
      </Routes>
      <Toaster />
    </>
  )
}
