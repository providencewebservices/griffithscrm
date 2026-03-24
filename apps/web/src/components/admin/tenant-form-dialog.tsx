import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { Tenant } from '@/hooks/use-tenants';

interface TenantFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: { name: string; slug: string }) => void;
	tenant?: Tenant | null;
	isLoading?: boolean;
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export function TenantFormDialog({
	open,
	onOpenChange,
	onSubmit,
	tenant,
	isLoading,
}: TenantFormDialogProps) {
	const [name, setName] = useState('');
	const [slug, setSlug] = useState('');
	const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isEdit = !!tenant;

	useEffect(() => {
		if (open) {
			if (tenant) {
				setName(tenant.name);
				setSlug(tenant.slug);
				setSlugManuallyEdited(true);
			} else {
				setName('');
				setSlug('');
				setSlugManuallyEdited(false);
			}
			setError(null);
		}
	}, [open, tenant]);

	const handleNameChange = (value: string) => {
		setName(value);
		if (!slugManuallyEdited) {
			setSlug(slugify(value));
		}
	};

	const handleSlugChange = (value: string) => {
		setSlug(value);
		setSlugManuallyEdited(true);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (!name.trim()) {
			setError('Name is required');
			return;
		}

		if (!slug.trim()) {
			setError('Slug is required');
			return;
		}

		if (!/^[a-z0-9-]+$/.test(slug)) {
			setError('Slug must be lowercase alphanumeric with hyphens only');
			return;
		}

		onSubmit({ name: name.trim(), slug: slug.trim() });
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{isEdit ? 'Edit Tenant' : 'Create Tenant'}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<FieldGroup>
						{error && <FieldError>{error}</FieldError>}
						<Field>
							<FieldLabel htmlFor="tenant-name">Name</FieldLabel>
							<Input
								id="tenant-name"
								value={name}
								onChange={(e) => handleNameChange(e.target.value)}
								placeholder="Acme Gravestones"
								disabled={isLoading}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="tenant-slug">Slug</FieldLabel>
							<Input
								id="tenant-slug"
								value={slug}
								onChange={(e) => handleSlugChange(e.target.value)}
								placeholder="acme-gravestones"
								disabled={isLoading}
							/>
							<p className="text-sm text-muted-foreground mt-1">
								URL-friendly identifier (lowercase, alphanumeric, hyphens)
							</p>
						</Field>
					</FieldGroup>
					<DialogFooter className="mt-6">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isLoading}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
