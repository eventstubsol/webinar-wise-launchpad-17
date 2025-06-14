
// Re-export all components from the refactored sidebar modules
export { SidebarProvider, useSidebar } from "./sidebar/SidebarProvider"
export { SidebarBase as Sidebar } from "./sidebar/SidebarBase"
export { 
  SidebarInset,
  SidebarInput,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  SidebarContent,
} from "./sidebar/SidebarComponents"
export {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarGroupContent,
} from "./sidebar/SidebarGroup"
export {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "./sidebar/SidebarMenu"
export { SidebarTrigger, SidebarRail } from "./sidebar/SidebarTrigger"
