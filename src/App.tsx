import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthProvider'
import Protected from '@/features/auth/Protected'
import AppShell from '@/components/layout/AppShell'

const Dashboard = lazy(() => import('@/features/dashboard/Dashboard'))
const PetList = lazy(() => import('@/features/pets/PetList'))
const PetDetail = lazy(() => import('@/features/pets/PetDetail'))
const PetForm = lazy(() => import('@/features/pets/PetForm'))
const CalendarPage = lazy(() => import('@/features/reminders/CalendarPage'))
const EmergencyPage = lazy(() => import('@/features/emergency/EmergencyPage'))
const SignIn = lazy(() => import('@/features/auth/SignIn'))
const SignUp = lazy(() => import('@/features/auth/SignUp'))
const ForgotPassword = lazy(() => import('@/features/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('@/features/auth/ResetPassword'))
const AuthCallback = lazy(() => import('@/features/auth/AuthCallback'))
const MfaChallenge = lazy(() => import('@/features/auth/MfaChallenge'))
const CareTeam = lazy(() => import('@/features/careteam/CareTeamPage'))
const SecuritySettings = lazy(() => import('@/features/account/SecuritySettings'))

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<div className="min-h-screen grid place-items-center text-ink/50">Loading…</div>}>
          <Routes>
            <Route path="/auth/sign-in" element={<SignIn />} />
            <Route path="/auth/sign-up" element={<SignUp />} />
            <Route path="/auth/forgot" element={<ForgotPassword />} />
            <Route path="/auth/reset" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/mfa" element={<MfaChallenge />} />
            <Route element={<Protected />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/pets" element={<PetList />} />
                <Route path="/pets/new" element={<PetForm />} />
                <Route path="/pets/:id" element={<PetDetail />} />
                <Route path="/pets/:id/edit" element={<PetForm />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/care-team" element={<CareTeam />} />
                <Route path="/settings" element={<SecuritySettings />} />
                <Route path="/emergency" element={<EmergencyPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
