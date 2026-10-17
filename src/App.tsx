import { Navigate, Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import { getSavedRole, pathForRole } from './lib/roles'
import AdminPage from './pages/AdminPage'
import FieldPage from './pages/FieldPage'
import StudentPage from './pages/StudentPage'
import TagsPrintPage from './pages/TagsPrintPage'
import TeacherPage from './pages/TeacherPage'

function AppLayout() {
  return (
    <>
      <Header />
      <main className="main">
        <Routes>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/field" element={<FieldPage />} />
          <Route path="/learn/teacher" element={<TeacherPage />} />
          <Route path="/learn/student" element={<StudentPage />} />
          <Route path="*" element={<Navigate to={pathForRole(getSavedRole())} replace />} />
        </Routes>
      </main>
      <footer className="footer">Demo data: fictional schools and partners.</footer>
    </>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Print pages have no header or footer. */}
      <Route path="/print/tags/:shipmentId" element={<TagsPrintPage />} />
      <Route path="*" element={<AppLayout />} />
    </Routes>
  )
}
