import * as React from "react"

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
import { useCustomerView } from "@/contexts/customer-view-context"
import { navItems, customerViewItems } from "@/lib/nav-items"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { isCustomerView } = useCustomerView()
	const items = isCustomerView
		? navItems.filter((item) => customerViewItems.includes(item.title))
		: navItems

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
				<NavMain items={items} />
			</SidebarContent>
			{!isCustomerView && (
				<SidebarFooter>
					<NavUser />
				</SidebarFooter>
			)}
			<SidebarRail />
		</Sidebar>
	)
}
