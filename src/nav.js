import {
  IconDashboard,
  IconClasses,
  IconStudents,
  IconAttendance,
  IconHistory,
  IconReports,
  IconProfile,
} from './components/icons';

export const primaryNav = [
  { to: '/', label: 'Dashboard', icon: IconDashboard, end: true },
  { to: '/classes', label: 'Classes', icon: IconClasses },
  { to: '/students', label: 'Students', icon: IconStudents },
  { to: '/attendance', label: 'Attendance', icon: IconAttendance },
];

export const moreNav = [
  { to: '/attendance-history', label: 'History', icon: IconHistory },
  { to: '/reports', label: 'Reports', icon: IconReports },
  { to: '/profile', label: 'Profile', icon: IconProfile },
];

export const navItems = [...primaryNav, ...moreNav];