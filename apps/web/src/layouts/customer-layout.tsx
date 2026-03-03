import { Outlet } from 'react-router'
import { AppSidebar } from "@/components/app-sidebar"
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { Eye, EyeOff } from "lucide-react"
import { CustomerViewProvider, useCustomerView } from "@/contexts/customer-view-context"

export function CustomerLayout() {
	return (
		<CustomerViewProvider>
			<SidebarProvider>
				<CustomerLayoutInner />
			</SidebarProvider>
		</CustomerViewProvider>
	)
}

function CustomerLayoutInner() {
	const { isCustomerView, toggleCustomerView } = useCustomerView()

	return (
		<>
			<AppSidebar />
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
					<div className="flex flex-1 items-center gap-2 px-4">
						<SidebarTrigger className="-ml-1" />
						<Separator orientation="vertical" className="mr-2 h-4" />
						<Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem>
									<BreadcrumbPage>Dashboard</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</div>
					<div className="flex items-center gap-2 px-4">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant={isCustomerView ? "default" : "ghost"}
									size="icon-sm"
									onClick={toggleCustomerView}
								>
									{isCustomerView ? <EyeOff /> : <Eye />}
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								{isCustomerView ? "Exit Customer View" : "Enter Customer View"}
							</TooltipContent>
						</Tooltip>
					</div>
				</header>
				<main className="flex-1 p-4 pt-0">
					<Outlet />
				</main>
			</SidebarInset>
		</>
	)
}
