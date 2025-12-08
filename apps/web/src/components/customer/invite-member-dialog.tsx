import { useState, useEffect } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldError,
} from '@/components/ui/field';
import type { TeamMember } from '@/hooks/use-team';

interface InviteMemberDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: { name: string; email: string }) => void;
	member?: TeamMember | null;
	isLoading?: boolean;
	error?: string | null;
}

export function InviteMemberDialog({
	open,
	onOpenChange,
	onSubmit,
	member,
	isLoading,
	error,
}: InviteMemberDialogProps) {
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');

	const isEditing = !!member;

	useEffect(() => {
		if (member) {
			setName(member.name);
			setEmail(member.email);
		} else {
			setName('');
			setEmail('');
		}
	}, [member, open]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSubmit({ name, email });
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{isEditing ? 'Edit Team Member' : 'Invite Team Member'}
					</DialogTitle>
					<DialogDescription>
						{isEditing
							? 'Update the team member details.'
							: 'Send an invitation email to add a new team member. They will receive an email to set their own password.'}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<FieldGroup>
						{error && <FieldError>{error}</FieldError>}
						<Field>
							<FieldLabel htmlFor="name">Name</FieldLabel>
							<Input
								id="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
								placeholder="John Doe"
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="email">Email</FieldLabel>
							<Input
								id="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								placeholder="john@example.com"
							/>
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
							{isLoading
								? isEditing
									? 'Saving...'
									: 'Sending Invite...'
								: isEditing
									? 'Save Changes'
									: 'Send Invite'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
