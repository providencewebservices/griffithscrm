import { useNavigate } from 'react-router'
import { ChevronsUpDown, LogOut } from "lucide-react"

import { signOut, useSession } from '@/lib/auth'
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar"

function getInitials(name: string | undefined): string {
	if (!name) return "?"
	return name
		.split(" ")
		.map((part) => part[0])
		.join("")
		.toUpperCase()
		.slice(0, 2)
}

export function NavUser() {
	const navigate = useNavigate()
	const { isMobile } = useSidebar()
	const { data: session } = useSession()

	const user = session?.user

	const handleSignOut = async () => {
		await signOut()
		navigate('/login', { replace: true })
	}

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center"
						>
							{/* Avatar: hidden when expanded, visible when collapsed */}
							<Avatar className="h-8 w-8 rounded-lg hidden group-data-[collapsible=icon]:flex">
								<AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
									{getInitials(user?.name)}
								</AvatarFallback>
							</Avatar>
							{/* Name/Email: visible when expanded, hidden when collapsed */}
							<div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
								<span className="truncate font-medium">{user?.name}</span>
								<span className="truncate text-xs">{user?.email}</span>
							</div>
							{/* Chevron: hidden when collapsed */}
							<ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
						side={isMobile ? "bottom" : "right"}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-medium">{user?.name}</span>
									<span className="truncate text-xs">{user?.email}</span>
								</div>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={handleSignOut}>
							<LogOut />
							Sign out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	)
}
