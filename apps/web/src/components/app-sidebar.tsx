import * as React from "react"
import { LayoutDashboard, UsersRound, Users, Settings, Package, FileText, Briefcase, Truck, Files, CalendarDays, Mail, ListChecks } from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/components/ui/sidebar"

const navItems = [
	{ title: "Dashboard", url: "/app", icon: LayoutDashboard },
	{ title: "Inbox", url: "/app/inbox", icon: Mail },
	{ title: "Quotes", url: "/app/quotes", icon: FileText },
	{ title: "Jobs", url: "/app/jobs", icon: Briefcase },
	{ title: "Tasks", url: "/app/tasks", icon: ListChecks },
	{ title: "Calendar", url: "/app/calendar", icon: CalendarDays },
	{ title: "Products", url: "/app/products", icon: Package },
	{ title: "Contacts", url: "/app/contacts", icon: Users },
	{ title: "Suppliers", url: "/app/suppliers", icon: Truck },
	{ title: "Documents", url: "/app/documents", icon: Files },
	{ title: "Team", url: "/app/team", icon: UsersRound },
	{ title: "Settings", url: "/app/settings", icon: Settings },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild className="group-data-[collapsible=icon]:justify-center">
							<a href="/app">
								<div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg">
									<span className="text-sm font-bold">G</span>
								</div>
								<div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
									<span className="truncate font-semibold">Griffiths CRM</span>
								</div>
							</a>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={navItems} />
			</SidebarContent>
			<SidebarFooter>
				<NavUser />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	)
}
