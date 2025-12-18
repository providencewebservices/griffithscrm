import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BusinessTab } from '@/components/customer/settings/business-tab';
import { PricingTab } from '@/components/customer/settings/pricing-tab';
import { LetteringTechniquesTab } from '@/components/customer/settings/lettering-techniques-tab';
import { LetteringColorsTab } from '@/components/customer/settings/lettering-colors-tab';
import { SundriesTab } from '@/components/customer/settings/sundries-tab';
import { ServicesTab } from '@/components/customer/settings/services-tab';
import { ProductCategoriesTab } from '@/components/customer/settings/product-categories-tab';
import { MaterialSectionsTab } from '@/components/customer/settings/material-sections-tab';
import { FinishesTab } from '@/components/customer/settings/finishes-tab';

export function SettingsPage() {
	return (
		<div>
			<div className="mb-6">
				<h2 className="text-2xl font-bold">Settings</h2>
				<p className="text-muted-foreground mt-1">
					Manage your business settings and configuration
				</p>
			</div>

			<Tabs defaultValue="business" className="space-y-6">
				<TabsList className="flex-wrap h-auto gap-1">
					<TabsTrigger value="business">Business</TabsTrigger>
					<TabsTrigger value="pricing">Pricing</TabsTrigger>
					<TabsTrigger value="categories">Categories</TabsTrigger>
					<TabsTrigger value="materials">Materials</TabsTrigger>
					<TabsTrigger value="finishes">Finishes</TabsTrigger>
					<TabsTrigger value="lettering-techniques">Lettering</TabsTrigger>
					<TabsTrigger value="lettering-colors">Colors</TabsTrigger>
					<TabsTrigger value="sundries">Sundries</TabsTrigger>
					<TabsTrigger value="services">Services</TabsTrigger>
				</TabsList>

				<TabsContent value="business">
					<BusinessTab />
				</TabsContent>

				<TabsContent value="pricing">
					<PricingTab />
				</TabsContent>

				<TabsContent value="categories">
					<ProductCategoriesTab />
				</TabsContent>

				<TabsContent value="materials">
					<MaterialSectionsTab />
				</TabsContent>

				<TabsContent value="finishes">
					<FinishesTab />
				</TabsContent>

				<TabsContent value="lettering-techniques">
					<LetteringTechniquesTab />
				</TabsContent>

				<TabsContent value="lettering-colors">
					<LetteringColorsTab />
				</TabsContent>

				<TabsContent value="sundries">
					<SundriesTab />
				</TabsContent>

				<TabsContent value="services">
					<ServicesTab />
				</TabsContent>
			</Tabs>
		</div>
	);
}
