import { useSearchParams } from 'react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomersList } from '@/components/contacts/customers-list';
import { FuneralDirectorsList } from '@/components/contacts/funeral-directors-list';
import { MemorialSitesList } from '@/components/contacts/memorial-sites-list';
import { Users, Building2, Church } from 'lucide-react';

type ContactTab = 'customers' | 'funeral-directors' | 'memorial-sites';

const TAB_CONFIG: { value: ContactTab; label: string; icon: typeof Users }[] = [
	{ value: 'customers', label: 'Customers', icon: Users },
	{ value: 'funeral-directors', label: 'Funeral Directors', icon: Building2 },
	{ value: 'memorial-sites', label: 'Memorial Sites', icon: Church },
];

export function ContactsPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const activeTab = (searchParams.get('tab') as ContactTab) || 'customers';

	const handleTabChange = (tab: string) => {
		if (tab === 'customers') {
			// Remove tab param for default tab to keep URL clean
			setSearchParams({});
		} else {
			setSearchParams({ tab });
		}
	};

	return (
		<div>
			<div className="mb-6">
				<h2 className="text-2xl font-bold">Contacts</h2>
				<p className="text-muted-foreground mt-1">
					Manage customers, funeral directors, and memorial sites
				</p>
			</div>

			<Tabs value={activeTab} onValueChange={handleTabChange}>
				<TabsList className="mb-6">
					{TAB_CONFIG.map(({ value, label, icon: Icon }) => (
						<TabsTrigger key={value} value={value} className="gap-2">
							<Icon className="h-4 w-4" />
							{label}
						</TabsTrigger>
					))}
				</TabsList>

				<TabsContent value="customers">
					<CustomersList />
				</TabsContent>

				<TabsContent value="funeral-directors">
					<FuneralDirectorsList />
				</TabsContent>

				<TabsContent value="memorial-sites">
					<MemorialSitesList />
				</TabsContent>
			</Tabs>
		</div>
	);
}
