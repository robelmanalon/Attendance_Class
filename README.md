# ClassTrack — Class Attendance Management System

A web-based class attendance management system for teachers, built with **Vite + React** and **Firebase** (Authentication + Cloud Firestore).

## Features

- Teacher registration, login, logout, and password reset (Firebase Authentication)
- Protected routes — each teacher only sees their own data
- Class management (create / edit / delete / view)
- **Bulk student import** by pasting a list (tab-separated, comma-separated, or name-only)
  - Automatic parsing with preview, duplicate detection, and missing-number generation
- Student database with search, class filters, add / edit / delete
- Daily attendance: Present / Absent / Late / Excused, mark-all shortcuts, save & update existing sessions
- Attendance history with filters (class, student, status, date range)
- Per-student attendance summary with attendance rate
- Reports with filters and export to **PDF**, **Excel**, **CSV**, and browser **Print**

## Tech Stack

- [Vite](https://vitejs.dev/) + [React 18](https://react.dev)
- [react-router-dom](https://reactrouter.com) v6
- [Firebase JS SDK](https://firebase.google.com/docs/web/setup) v10
- [jsPDF](https://github.com/parallax/jsPDF) + [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable) for PDF export
- [SheetJS xlsx](https://sheetjs.com/) for Excel export

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Firebase project

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a project.
2. **Add a web app** (Project settings → Your apps → Web `</>`).
3. Copy the config values into an environment file:

   Copy `.env.example` to `.env.local` and fill it in:

   ```bash
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_STORAGE_BUCKET=
   VITE_FIREBASE_MESSAGING_SENDER_ID=
   VITE_FIREBASE_APP_ID=
   ```

   > Never commit `.env.local`. Real keys stay out of the repo.

4. In **Authentication → Sign-in method**, enable **Email/Password**.
5. In **Firestore Database**, create the database (production mode).

### 3. Deploy Firestore security rules

Deploy the rules file with the Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

You can also paste the contents of `firestore.rules` into **Firestore → Rules** in the console.

### 4. Run the app

```bash
npm run dev
```

Open http://localhost:5173

### 5. Build for production

```bash
npm run build
npm run preview
```

## Firestore Data Model

```
users/{userId}
  name: string
  email: string
  createdAt: timestamp

classes/{classId}
  teacherId: string        // owner uid
  subjectName: string
  section: string
  instructor: string
  schoolYear: string
  semester: string
  schedule: string
  room: string
  createdAt: timestamp

students/{studentId}
  classId: string
  teacherId: string        // owner uid
  studentNumber: string
  fullName: string
  email: string
  status: string           // active | inactive
  createdAt: timestamp

attendance/{attendanceId}
  classId: string
  studentId: string
  teacherId: string        // owner uid
  date: string             // YYYY-MM-DD
  status: string           // present | absent | late | excused
  timeRecorded: timestamp
  createdAt: timestamp
```

Attendance uniqueness is handled by the app: creating a session for the same
(class, student, date) updates the existing record instead of duplicating it.

## Security Rules

See `firestore.rules`. Rules enforce that a teacher can only access documents
where `teacherId == request.auth.uid`.

## Environment Variables

| Variable                          | Source (Firebase Console)                |
| --------------------------------- | ---------------------------------------- |
| `VITE_FIREBASE_API_KEY`           | Web app → `apiKey`                       |
| `VITE_FIREBASE_AUTH_DOMAIN`       | Web app → `authDomain`                   |
| `VITE_FIREBASE_PROJECT_ID`        | Web app → `projectId`                    |
| `VITE_FIREBASE_STORAGE_BUCKET`    | Web app → `storageBucket`                |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Web app → `messagingSenderId`          |
| `VITE_FIREBASE_APP_ID`            | Web app → `appId`                        |

## Recommended Firestore Indexes

If a query requires additional indexes, Firestore will prompt you with a link
in the console when you run the app. Add the suggested composite indexes there.

## Project Structure

```
src/
  components/        Sidebar, Navbar, modals, tables, exports, imports
  context/           Auth & Toast context
  firebase/          config, auth, firestore
  pages/             Login, Register, Dashboard, Classes, Students, Attendance, ...
  services/          classService, studentService, attendanceService, userService
  utils/             studentParser, attendanceCalculator, pdf/excel/csv exports, format
firestore.rules      Firestore security rules
.env.example         Template for Firebase config
```