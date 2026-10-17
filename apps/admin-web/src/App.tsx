import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, Link, Navigate, RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/auth/AuthProvider';
import { HomeRedirect, RequireRole, RequireStaff } from '@/auth/guards';
import { EmptyState } from '@/components/data/display';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { DashboardPage } from '@/pages/admin/DashboardPage';
import { ChangePasswordPage } from '@/pages/auth/ChangePasswordPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { AccountPage } from '@/pages/shared/AccountPage';
import { AnalyticsPage } from '@/pages/shared/AnalyticsPage';
import { AttemptDetailPage } from '@/pages/shared/AttemptDetailPage';
import { AuditLogPage } from '@/pages/shared/AuditLogPage';
import { CareerQuestionsPage } from '@/pages/shared/CareerQuestionsPage';
import { ProgramAssessmentDetailPage, ProgramAssessmentFormPage, ProgramAssessmentsPage } from '@/pages/shared/ProgramAssessmentsPage';
import { ProgramDetailPage } from '@/pages/shared/ProgramDetailPage';
import { ProgramFormPage } from '@/pages/shared/ProgramFormPage';
import { ProgramsPage } from '@/pages/shared/ProgramsPage';
import { ResultDetailPage } from '@/pages/shared/ResultDetailPage';
import { ResultsPage } from '@/pages/shared/ResultsPage';
import { StudentDetailPage } from '@/pages/shared/StudentDetailPage';
import { AdminDetailPage } from '@/pages/super/AdminDetailPage';
import { AdminNewPage } from '@/pages/super/AdminNewPage';
import { AdminsPage } from '@/pages/super/AdminsPage';
import { DepartmentDetailPage } from '@/pages/super/DepartmentDetailPage';
import { DepartmentsPage } from '@/pages/super/DepartmentsPage';
import { OverviewPage } from '@/pages/super/OverviewPage';
import { RegistrationPage } from '@/pages/super/RegistrationPage';
import { StudentsPage } from '@/pages/super/StudentsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 20_000, retry: 1, refetchOnWindowFocus: false },
  },
});

function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      description="The page may have moved, or you may not have access to it."
      action={
        <Button asChild>
          <Link to="/">Go home</Link>
        </Button>
      }
    />
  );
}

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/change-password', element: <ChangePasswordPage /> },
  {
    element: <RequireStaff />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <HomeRedirect /> },
          // shared (both roles; data is scoped by role)
          { path: 'analytics', element: <AnalyticsPage /> },
          { path: 'results', element: <ResultsPage /> },
          { path: 'results/:resultId', element: <ResultDetailPage /> },
          { path: 'attempts/:attemptId', element: <AttemptDetailPage /> },
          { path: 'students/:uid', element: <StudentDetailPage /> },
          { path: 'programs', element: <ProgramsPage /> },
          { path: 'programs/new', element: <ProgramFormPage /> },
          { path: 'programs/:programId', element: <ProgramDetailPage /> },
          { path: 'programs/:programId/edit', element: <ProgramFormPage /> },
          { path: 'career-questions', element: <CareerQuestionsPage /> },
          { path: 'program-assessments', element: <ProgramAssessmentsPage /> },
          { path: 'program-assessments/new', element: <ProgramAssessmentFormPage /> },
          { path: 'program-assessments/:assessmentId', element: <ProgramAssessmentDetailPage /> },
          { path: 'program-assessments/:assessmentId/edit', element: <ProgramAssessmentFormPage /> },
          { path: 'account', element: <AccountPage /> },
          // department admin
          {
            element: <RequireRole role="admin" />,
            children: [
              { path: 'dashboard', element: <DashboardPage /> },
              { path: 'activity', element: <AuditLogPage /> },
            ],
          },
          // super admin
          {
            element: <RequireRole role="superadmin" />,
            children: [
              { path: 'overview', element: <OverviewPage /> },
              { path: 'departments', element: <DepartmentsPage /> },
              { path: 'departments/:deptId', element: <DepartmentDetailPage /> },
              { path: 'admins', element: <AdminsPage /> },
              { path: 'admins/new', element: <AdminNewPage /> },
              { path: 'admins/:uid', element: <AdminDetailPage /> },
              { path: 'registration', element: <RegistrationPage /> },
              { path: 'students', element: <StudentsPage /> },
              { path: 'audit-log', element: <AuditLogPage /> },
            ],
          },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{ style: { fontFamily: 'var(--font-sans)', borderRadius: 12 } }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
