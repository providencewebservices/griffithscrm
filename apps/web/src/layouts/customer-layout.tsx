import { Eye, EyeOff } from 'lucide-react';
import { Outlet } from 'react-router';
import { AppSidebar } from '@/components/app-sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { CustomerViewProvider, useCustomerView } from '@/contexts/customer-view-context';

export function CustomerLayout() {
	return (
		<CustomerViewProvider>
			<SidebarProvider defaultOpen={false}>
				<CustomerLayoutInner />
			</SidebarProvider>
		</CustomerViewProvider>
	);
}

function CustomerLayoutInner() {
	const { isCustomerView, toggleCustomerView } = useCustomerView();

	return (
		<>
			<AppSidebar />
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
					<div className="flex flex-1 items-center gap-2 px-4">
						<SidebarTrigger className="-ml-1" />
						<Separator orientation="vertical" className="mr-2 h-4" />
					</div>
					<div className="flex items-center gap-2 px-4">
						<Button
							variant={isCustomerView ? 'default' : 'outline'}
							size="sm"
							onClick={toggleCustomerView}
						>
							{isCustomerView ? <EyeOff /> : <Eye />}
							{isCustomerView ? 'Exit Customer View' : 'Customer View'}
						</Button>
					</div>
				</header>
				<main className="flex-1 p-4 pt-0">
					<Outlet />
				</main>
			</SidebarInset>
		</>
	);
}
