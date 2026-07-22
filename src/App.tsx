import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { TaskProvider } from "@/context/TaskContext";
import Dashboard from "@/pages/Dashboard";
import MyDay from "@/pages/MyDay";
import CalendarMeetings from "@/pages/CalendarMeetings";
import TeamChat from "@/pages/TeamChat";
import KnowledgeBase from "@/pages/KnowledgeBase";
import CustomBoards from "@/pages/CustomBoards";
import HRRequests from "@/pages/HRRequests";
import EmployeeDirectory from "@/pages/EmployeeDirectory";
import AIAssistant from "@/pages/AIAssistant";
import Projects from "@/pages/Projects";
import ProjectDetails from "@/pages/ProjectDetails";
import Timeline from "@/pages/Timeline";
import DocsNotes from "@/pages/DocsNotes";
import RecognitionBirthdays from "@/pages/RecognitionBirthdays";
import CompanyPolicies from "@/pages/CompanyPolicies";
import WorkflowAutomation from "@/pages/WorkflowAutomation";
import PredictiveInsights from "@/pages/PredictiveInsights";
import ResourcePlanning from "@/pages/ResourcePlanning";
import TemplateMarketplace from "@/pages/TemplateMarketplace";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";

// HR & Employees additions
import Attendance from "@/pages/Attendance";
import { CompanyPulse } from "@/pages/CompanyPulse";
import PendingApprovals from "@/pages/PendingApprovals";

// Learning & Training additions
import LearningCenter from "@/pages/LearningCenter";
import MyCertificates from "@/pages/MyCertificates";
import CoursePreview from "@/pages/CoursePreview";

// Collaboration additions
import MOMList from "@/pages/MOMList";
import CreateMOM from "@/pages/CreateMOM";
import MOMDetails from "@/pages/MOMDetails";

// AI & Automation additions
import AIAgents from "@/pages/AIAgents";

// Admin additions
import Setup from "@/pages/Setup";
import Branding from "@/pages/Branding";
import Integrations from "@/pages/Integrations";

// Super Admin additions
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import { OrganizationManagement } from "@/pages/OrganizationManagement";
import SitesList from "@/pages/SitesList";
import AddSite from "@/pages/AddSite";
import OrganizationBillingDetails from "@/pages/OrganizationBillingDetails";
import Billing from "@/pages/Billing";
import UsersList from "@/pages/UsersList";

export const APP_ROUTES = [
  // My Work
  { id: "dashboard", path: "/", title: "Dashboard", category: "My Work" },
  { id: "tasks-my-day", path: "/tasks/my-day", title: "My Day", category: "My Work" },
  { id: "tasks-calendar", path: "/tasks/calendar", title: "Calendar", category: "My Work" },
  { id: "tasks-projects", path: "/tasks/projects", title: "Projects", category: "My Work" },
  { id: "tasks-timeline", path: "/tasks/timeline", title: "Timeline", category: "My Work" },
  { id: "tasks-resources", path: "/tasks/resources", title: "Resources", category: "My Work" },
  { id: "tasks-templates", path: "/tasks/templates", title: "Templates", category: "My Work" },
  { id: "mom-list", path: "/collaboration/moms", title: "MOM", category: "My Work" },

  // Collaboration
  { id: "team-chat", path: "/collaboration/chat", title: "Team Chat", category: "Collaboration" },
  { id: "docs-notes", path: "/collaboration/docs", title: "Docs & Notes", category: "Collaboration" },
  { id: "knowledge-base", path: "/collaboration/wiki", title: "Knowledge Base", category: "Collaboration" },
  { id: "custom-boards", path: "/collaboration/boards", title: "My Boards", category: "Collaboration" },

  // Learning Center
  { id: "learning-center", path: "/learning", title: "Learning Center", category: "Learning Center" },

  // HR Services
  { id: "hr-requests", path: "/hr/requests", title: "HR Requests", category: "HR Services" },
  { id: "employee-directory", path: "/hr/directory", title: "Directory", category: "HR Services" },
  { id: "recognition", path: "/hr/recognition", title: "Recognition", category: "HR Services" },
  { id: "company-policies", path: "/hr/policies", title: "Policies", category: "HR Services" },
  { id: "attendance", path: "/hr/attendance", title: "Attendance", category: "HR Services" },
  { id: "company-pulse", path: "/hr/company-pulse", title: "Company Pulse", category: "HR Services" },

  // AI & Automation
  { id: "workflow-automation", path: "/ai/workflows", title: "Workflows", category: "AI & Automation" },
  { id: "predictive-insights", path: "/ai/insights", title: "Insights", category: "AI & Automation" },
  { id: "ai-agents", path: "/ai/agents", title: "AI Agents", category: "AI & Automation" },

  // Site Admin
  { id: "admin-setup", path: "/admin/setup", title: "Setup", category: "Site Admin" },
  { id: "admin-branding", path: "/admin/branding", title: "Branding", category: "Site Admin" },
  { id: "admin-integrations", path: "/admin/integrations", title: "Integrations", category: "Site Admin" },
];

import { AuthProvider } from "@/context/AuthContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <TaskProvider>
            <AppLayout>
              <Routes>
              <Route path="/" element={<ProtectedRoute route="/"><Dashboard /></ProtectedRoute>} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              
              {/* Task & Project Management */}
              <Route path="/tasks/my-day" element={<ProtectedRoute route="/tasks/my-day"><MyDay /></ProtectedRoute>} />
              <Route path="/tasks/calendar" element={<ProtectedRoute route="/tasks/calendar"><CalendarMeetings /></ProtectedRoute>} />
              <Route path="/tasks/projects" element={<ProtectedRoute route="/tasks/projects"><Projects /></ProtectedRoute>} />
              <Route path="/tasks/projects/:id" element={<ProtectedRoute route="/tasks/projects"><ProjectDetails /></ProtectedRoute>} />
              <Route path="/tasks/timeline" element={<ProtectedRoute route="/tasks/timeline"><Timeline /></ProtectedRoute>} />
              <Route path="/tasks/resources" element={<ProtectedRoute route="/tasks/resources"><ResourcePlanning /></ProtectedRoute>} />
              <Route path="/tasks/templates" element={<ProtectedRoute route="/tasks/templates"><TemplateMarketplace /></ProtectedRoute>} />
              
              {/* Collaboration */}
              <Route path="/collaboration/chat" element={<ProtectedRoute route="/collaboration/chat"><TeamChat /></ProtectedRoute>} />
              <Route path="/collaboration/docs" element={<ProtectedRoute route="/collaboration/docs"><DocsNotes /></ProtectedRoute>} />
              <Route path="/collaboration/wiki" element={<ProtectedRoute route="/collaboration/wiki"><KnowledgeBase /></ProtectedRoute>} />
              <Route path="/collaboration/boards" element={<ProtectedRoute route="/collaboration/boards"><CustomBoards /></ProtectedRoute>} />
              <Route path="/collaboration/moms" element={<ProtectedRoute route="/collaboration/moms"><MOMList /></ProtectedRoute>} />
              <Route path="/collaboration/moms/create" element={<ProtectedRoute route="/collaboration/moms"><CreateMOM /></ProtectedRoute>} />
              <Route path="/collaboration/moms/:id" element={<ProtectedRoute route="/collaboration/moms"><MOMDetails /></ProtectedRoute>} />
              
              {/* HR Services */}
              <Route path="/hr/requests" element={<ProtectedRoute route="/hr/requests"><HRRequests /></ProtectedRoute>} />
              <Route path="/hr/directory" element={<ProtectedRoute route="/hr/directory"><EmployeeDirectory /></ProtectedRoute>} />
              <Route path="/hr/recognition" element={<ProtectedRoute route="/hr/recognition"><RecognitionBirthdays /></ProtectedRoute>} />
              <Route path="/hr/policies" element={<ProtectedRoute route="/hr/policies"><CompanyPolicies /></ProtectedRoute>} />
              <Route path="/hr/attendance" element={<ProtectedRoute route="/hr/attendance"><Attendance /></ProtectedRoute>} />
              <Route path="/hr/company-pulse" element={<ProtectedRoute route="/hr/company-pulse"><CompanyPulse /></ProtectedRoute>} />
              <Route path="/hr/approvals" element={<ProtectedRoute route="/hr/approvals"><PendingApprovals /></ProtectedRoute>} />
              
              {/* Learning & Training */}
              <Route path="/learning" element={<ProtectedRoute route="/learning"><LearningCenter /></ProtectedRoute>} />
              <Route path="/learning/certificates" element={<ProtectedRoute route="/learning/certificates"><MyCertificates /></ProtectedRoute>} />
              <Route path="/learning/course/:id" element={<ProtectedRoute route="/learning"><CoursePreview /></ProtectedRoute>} />
              
              {/* AI & Automation */}
              <Route path="/ai/assistant" element={<ProtectedRoute route="/ai/assistant"><AIAssistant /></ProtectedRoute>} />
              <Route path="/ai/workflows" element={<ProtectedRoute route="/ai/workflows"><WorkflowAutomation /></ProtectedRoute>} />
              <Route path="/ai/insights" element={<ProtectedRoute route="/ai/insights"><PredictiveInsights /></ProtectedRoute>} />
              <Route path="/ai/agents" element={<ProtectedRoute route="/ai/agents"><AIAgents /></ProtectedRoute>} />
              
              {/* Admin */}
              <Route path="/admin/setup" element={<ProtectedRoute route="/admin/setup"><Setup /></ProtectedRoute>} />
              <Route path="/admin/branding" element={<ProtectedRoute route="/admin/branding"><Branding /></ProtectedRoute>} />
              <Route path="/admin/integrations" element={<ProtectedRoute route="/admin/integrations"><Integrations /></ProtectedRoute>} />
              
              {/* Super Admin */}
              <Route path="/superadmin" element={<ProtectedRoute route="/superadmin"><SuperAdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/organizations" element={<ProtectedRoute route="/admin/organizations"><OrganizationManagement /></ProtectedRoute>} />
              <Route path="/admin/sites" element={<ProtectedRoute route="/admin/sites"><SitesList /></ProtectedRoute>} />
              <Route path="/admin/sites/add" element={<ProtectedRoute route="/admin/sites"><AddSite /></ProtectedRoute>} />
              <Route path="/admin/billing" element={<ProtectedRoute route="/admin/billing"><Billing /></ProtectedRoute>} />
              <Route path="/admin/organizations/:id/billing" element={<ProtectedRoute route="/admin/organizations"><OrganizationBillingDetails /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute route="/admin/users"><UsersList /></ProtectedRoute>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
            </AppLayout>
          </TaskProvider>
          </AuthProvider>
        </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
