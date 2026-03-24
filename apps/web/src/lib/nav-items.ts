import {
	Briefcase,
	CalendarDays,
	Files,
	FileText,
	LayoutDashboard,
	ListChecks,
	Mail,
	Package,
	Settings,
	Truck,
	Users,
	UsersRound,
} from 'lucide-react';

export const navItems = [
	{ title: 'Dashboard', url: '/app', icon: LayoutDashboard },
	{ title: 'Inbox', url: '/app/inbox', icon: Mail },
	{ title: 'Quotes', url: '/app/quotes', icon: FileText },
	{ title: 'Jobs', url: '/app/jobs', icon: Briefcase },
	{ title: 'Tasks', url: '/app/tasks', icon: ListChecks },
	{ title: 'Calendar', url: '/app/calendar', icon: CalendarDays },
	{ title: 'Products', url: '/app/products', icon: Package },
	{ title: 'Contacts', url: '/app/contacts', icon: Users },
	{ title: 'Suppliers', url: '/app/suppliers', icon: Truck },
	{ title: 'Documents', url: '/app/documents', icon: Files },
	{ title: 'Team', url: '/app/team', icon: UsersRound },
	{ title: 'Settings', url: '/app/settings', icon: Settings },
];

export const customerViewItems = ['Quotes', 'Products'];
