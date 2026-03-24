import type { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router';

import {
	SidebarGroup,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useUnreadCountQuery } from '@/hooks/use-inbox';

export function NavMain({ items }: { items: { title: string; url: string; icon: LucideIcon }[] }) {
	const { data: unreadCount } = useUnreadCountQuery();

	return (
		<SidebarGroup>
			<SidebarMenu>
				{items.map((item) => (
					<SidebarMenuItem key={item.title}>
						<SidebarMenuButton asChild tooltip={item.title}>
							<NavLink to={item.url} end={item.url === '/app'} className="relative">
								<item.icon />
								<span>{item.title}</span>
								{item.title === 'Inbox' && unreadCount ? (
									<span className="absolute top-1 left-[1.1rem] size-2 rounded-full bg-red-500 group-data-[collapsible=icon]:left-3.5 group-data-[collapsible=icon]:top-0.5" />
								) : null}
							</NavLink>
						</SidebarMenuButton>
					</SidebarMenuItem>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}
