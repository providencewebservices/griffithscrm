import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useProductCategoriesQuery } from '@/hooks/use-product-categories';

type CategorySelectProps = {
	value: string | null | undefined;
	onChange: (value: string | null) => void;
	placeholder?: string;
	allowClear?: boolean;
};

export function CategorySelect({
	value,
	onChange,
	placeholder = 'Select category',
	allowClear = false,
}: CategorySelectProps) {
	const { data: categories, isLoading } = useProductCategoriesQuery();

	return (
		<Select value={value || ''} onValueChange={(val) => onChange(val === '__none__' ? null : val)}>
			<SelectTrigger>
				<SelectValue placeholder={isLoading ? 'Loading...' : placeholder} />
			</SelectTrigger>
			<SelectContent>
				{allowClear && (
					<SelectItem value="__none__">
						<span className="text-muted-foreground">All Categories</span>
					</SelectItem>
				)}
				{categories?.map((category) => (
					<SelectItem key={category.id} value={category.id}>
						{category.name}
					</SelectItem>
				))}
				{categories?.length === 0 && (
					<div className="px-2 py-1.5 text-sm text-muted-foreground">No categories available</div>
				)}
			</SelectContent>
		</Select>
	);
}
