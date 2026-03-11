import { useSearchParams } from 'react-router';
import {
	Building2,
	Percent,
	FolderTree,
	Layers,
	Paintbrush,
	Type,
	Package,
	List,
	Mail,
	CreditCard,
} from 'lucide-react';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { BusinessTab } from '@/components/customer/settings/business-tab';
import { PricingTab } from '@/components/customer/settings/pricing-tab';
import { LetteringTab } from '@/components/customer/settings/lettering-tab';
import { SundriesTab } from '@/components/customer/settings/sundries-tab';
import { LineItemsTab } from '@/components/customer/settings/line-items-tab';
import { ProductCategoriesTab } from '@/components/customer/settings/product-categories-tab';
import { MaterialSectionsTab } from '@/components/customer/settings/material-sections-tab';
import { FinishesTab } from '@/components/customer/settings/finishes-tab';
import { IntegrationsTab } from '@/components/customer/settings/integrations-tab';
import { PaymentsTab } from '@/components/customer/settings/payments-tab';

type SettingsTab =
	| 'business'
	| 'pricing'
	| 'categories'
	| 'materials'
	| 'finishes'
	| 'lettering'
	| 'sundries'
	| 'line-items'
	| 'integrations'
	| 'payments';

type TabItem = { value: SettingsTab; label: string; icon: typeof Building2 };

const TAB_GROUPS: { label: string | null; items: TabItem[] }[] = [
	{
		label: null,
		items: [
			{ value: 'business', label: 'Business', icon: Building2 },
		],
	},
	{
		label: 'Product Catalog',
		items: [
			{ value: 'pricing', label: 'Pricing', icon: Percent },
			{ value: 'categories', label: 'Categories', icon: FolderTree },
			{ value: 'materials', label: 'Materials', icon: Layers },
			{ value: 'finishes', label: 'Finishes', icon: Paintbrush },
			{ value: 'lettering', label: 'Lettering', icon: Type },
			{ value: 'sundries', label: 'Sundries', icon: Package },
			{ value: 'line-items', label: 'Line Items', icon: List },
		],
	},
	{
		label: 'System',
		items: [
			{ value: 'integrations', label: 'Integrations', icon: Mail },
			{ value: 'payments', label: 'Payments', icon: CreditCard },
		],
	},
];

const TAB_CONFIG = TAB_GROUPS.flatMap((g) => g.items);

function SettingsContent({ tab }: { tab: SettingsTab }) {
	switch (tab) {
		case 'business':
			return <BusinessTab />;
		case 'pricing':
			return <PricingTab />;
		case 'categories':
			return <ProductCategoriesTab />;
		case 'materials':
			return <MaterialSectionsTab />;
		case 'finishes':
			return <FinishesTab />;
		case 'lettering':
			return <LetteringTab />;
		case 'sundries':
			return <SundriesTab />;
		case 'line-items':
			return <LineItemsTab />;
		case 'integrations':
			return <IntegrationsTab />;
		case 'payments':
			return <PaymentsTab />;
		default:
			return <BusinessTab />;
	}
}

export function SettingsPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const activeTab = (searchParams.get('tab') as SettingsTab) || 'business';

	const handleTabChange = (tab: string) => {
		if (tab === 'business') {
			setSearchParams({});
		} else {
			setSearchParams({ tab });
		}
	};

	const activeConfig = TAB_CONFIG.find((t) => t.value === activeTab) || TAB_CONFIG[0];

	return (
		<div>
			<div className="mb-6">
				<h2 className="text-2xl font-bold">Settings</h2>
				<p className="text-muted-foreground mt-1">
					Manage your business settings and configuration
				</p>
			</div>

			{/* Mobile: Dropdown selector */}
			<div className="lg:hidden mb-6">
				<Select value={activeTab} onValueChange={handleTabChange}>
					<SelectTrigger className="w-full">
						<SelectValue>
							<span className="flex items-center gap-2">
								<activeConfig.icon className="h-4 w-4" />
								{activeConfig.label}
							</span>
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{TAB_GROUPS.map((group, groupIndex) => (
							<SelectGroup key={groupIndex}>
								{group.label && <SelectLabel>{group.label}</SelectLabel>}
								{group.items.map(({ value, label, icon: Icon }) => (
									<SelectItem key={value} value={value}>
										<span className="flex items-center gap-2">
											<Icon className="h-4 w-4" />
											{label}
										</span>
									</SelectItem>
								))}
							</SelectGroup>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Desktop: Sidebar + Content layout */}
			<div className="flex gap-8">
				{/* Sidebar navigation - hidden on mobile */}
				<nav className="hidden lg:block w-48 flex-shrink-0">
					{TAB_GROUPS.map((group, groupIndex) => (
						<div key={groupIndex} className={groupIndex > 0 ? 'pt-4' : ''}>
							{group.label && (
								<div className="px-3 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
									{group.label}
								</div>
							)}
							<ul className="space-y-1">
								{group.items.map(({ value, label, icon: Icon }) => (
									<li key={value}>
										<button
											onClick={() => handleTabChange(value)}
											className={cn(
												'w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors',
												activeTab === value
													? 'bg-primary text-primary-foreground font-medium'
													: 'text-muted-foreground hover:bg-muted hover:text-foreground'
											)}
										>
											<Icon className="h-4 w-4" />
											{label}
										</button>
									</li>
								))}
							</ul>
						</div>
					))}
				</nav>

				{/* Content area */}
				<div className="flex-1 min-w-0">
					<SettingsContent tab={activeTab} />
				</div>
			</div>
		</div>
	);
}
