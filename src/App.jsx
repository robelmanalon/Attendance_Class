import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Classes from './pages/Classes';
import ClassDetail from './pages/ClassDetail';
import Students from './pages/Students';
import Attendance from './pages/Attendance';
import AttendanceHistory from './pages/AttendanceHistory';
import StudentDetail from './pages/StudentDetail';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/classes" element={<Classes />} />
        <Route path="/classes/:classId" element={<ClassDetail />} />
        <Route path="/students" element={<Students />} />
        <Route path="/students/:classId" element={<Students />} />
        <Route path="/students/detail/:studentId" element={<StudentDetail />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/attendance-history" element={<AttendanceHistory />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}