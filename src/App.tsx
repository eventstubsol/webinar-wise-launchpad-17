
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { UserSettingsProvider } from "@/contexts/UserSettingsContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import EmailTemplates from "./pages/EmailTemplates";
import Campaigns from "./pages/Campaigns";
import AdvancedAnalytics from "./pages/AdvancedAnalytics";
import NotFound from "./pages/NotFound";
import ZoomCallbackPage from "./pages/auth/zoom/callback";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ProfileProvider>
        <UserSettingsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/auth/zoom/callback" element={<ZoomCallbackPage />} />
                
                {/* Protected routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <SidebarProvider>
                        <AppSidebar />
                        <SidebarInset>
                          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                            <div className="flex items-center gap-2 px-4">
                              <SidebarTrigger className="-ml-1" />
                              <Separator orientation="vertical" className="mr-2 h-4" />
                              <Breadcrumb>
                                <BreadcrumbList>
                                  <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="/dashboard">
                                      Dashboard
                                    </BreadcrumbLink>
                                  </BreadcrumbItem>
                                </BreadcrumbList>
                              </Breadcrumb>
                            </div>
                          </header>
                          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                            <Dashboard />
                          </div>
                        </SidebarInset>
                      </SidebarProvider>
                    </ProtectedRoute>
                  }
                />
                
                <Route
                  path="/email-templates"
                  element={
                    <ProtectedRoute>
                      <SidebarProvider>
                        <AppSidebar />
                        <SidebarInset>
                          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                            <div className="flex items-center gap-2 px-4">
                              <SidebarTrigger className="-ml-1" />
                              <Separator orientation="vertical" className="mr-2 h-4" />
                              <Breadcrumb>
                                <BreadcrumbList>
                                  <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="/dashboard">
                                      Dashboard
                                    </BreadcrumbLink>
                                  </BreadcrumbItem>
                                  <BreadcrumbSeparator className="hidden md:block" />
                                  <BreadcrumbItem>
                                    <BreadcrumbPage>Email Templates</BreadcrumbPage>
                                  </BreadcrumbItem>
                                </BreadcrumbList>
                              </Breadcrumb>
                            </div>
                          </header>
                          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                            <EmailTemplates />
                          </div>
                        </SidebarInset>
                      </SidebarProvider>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/campaigns"
                  element={
                    <ProtectedRoute>
                      <SidebarProvider>
                        <AppSidebar />
                        <SidebarInset>
                          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                            <div className="flex items-center gap-2 px-4">
                              <SidebarTrigger className="-ml-1" />
                              <Separator orientation="vertical" className="mr-2 h-4" />
                              <Breadcrumb>
                                <BreadcrumbList>
                                  <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="/dashboard">
                                      Dashboard
                                    </BreadcrumbLink>
                                  </BreadcrumbItem>
                                  <BreadcrumbSeparator className="hidden md:block" />
                                  <BreadcrumbItem>
                                    <BreadcrumbPage>Email Campaigns</BreadcrumbPage>
                                  </BreadcrumbItem>
                                </BreadcrumbList>
                              </Breadcrumb>
                            </div>
                          </header>
                          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                            <Campaigns />
                          </div>
                        </SidebarInset>
                      </SidebarProvider>
                    </ProtectedRoute>
                  }
                />
                
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <SidebarProvider>
                        <AppSidebar />
                        <SidebarInset>
                          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                            <div className="flex items-center gap-2 px-4">
                              <SidebarTrigger className="-ml-1" />
                              <Separator orientation="vertical" className="mr-2 h-4" />
                              <Breadcrumb>
                                <BreadcrumbList>
                                  <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="/dashboard">
                                      Dashboard
                                    </BreadcrumbLink>
                                  </BreadcrumbItem>
                                  <BreadcrumbSeparator className="hidden md:block" />
                                  <BreadcrumbItem>
                                    <BreadcrumbPage>Settings</BreadcrumbPage>
                                  </BreadcrumbItem>
                                </BreadcrumbList>
                              </Breadcrumb>
                            </div>
                          </header>
                          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                            <Settings />
                          </div>
                        </SidebarInset>
                      </SidebarProvider>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/advanced-analytics"
                  element={
                    <ProtectedRoute>
                      <SidebarProvider>
                        <AppSidebar />
                        <SidebarInset>
                          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                            <div className="flex items-center gap-2 px-4">
                              <SidebarTrigger className="-ml-1" />
                              <Separator orientation="vertical" className="mr-2 h-4" />
                              <Breadcrumb>
                                <BreadcrumbList>
                                  <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="/dashboard">
                                      Dashboard
                                    </BreadcrumbLink>
                                  </BreadcrumbItem>
                                  <BreadcrumbSeparator className="hidden md:block" />
                                  <BreadcrumbItem>
                                    <BreadcrumbPage>Advanced Analytics</BreadcrumbPage>
                                  </BreadcrumbItem>
                                </BreadcrumbList>
                              </Breadcrumb>
                            </div>
                          </header>
                          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                            <AdvancedAnalytics />
                          </div>
                        </SidebarInset>
                      </SidebarProvider>
                    </ProtectedRoute>
                  }
                />

                {/* Fallback routes */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </UserSettingsProvider>
      </ProfileProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
