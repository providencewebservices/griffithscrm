import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { signIn, useSession } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldError,
} from '@/components/ui/field';

export function LoginPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const { data: session } = useSession();

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const from = (location.state as { from?: Location })?.from?.pathname || '/';

	if (session) {
		navigate(from, { replace: true });
		return null;
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setIsLoading(true);

		try {
			const result = await signIn.email({
				email,
				password,
			});

			if (result.error) {
				setError(result.error.message || 'Failed to sign in');
			} else {
				navigate(from, { replace: true });
			}
		} catch (err) {
			setError('An unexpected error occurred');
			console.error('Login error:', err);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			<div className="w-full max-w-sm">
				<Card>
					<CardHeader>
						<CardTitle>Griffiths CRM</CardTitle>
						<CardDescription>Sign in to your account</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit}>
							<FieldGroup>
								{error && (
									<FieldError>{error}</FieldError>
								)}
								<Field>
									<FieldLabel htmlFor="email">Email</FieldLabel>
									<Input
										id="email"
										type="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										required
										autoComplete="email"
										placeholder="you@example.com"
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="password">Password</FieldLabel>
									<Input
										id="password"
										type="password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										required
										autoComplete="current-password"
									/>
								</Field>
								<Field>
									<Button type="submit" disabled={isLoading} className="w-full">
										{isLoading ? 'Signing in...' : 'Sign in'}
									</Button>
								</Field>
							</FieldGroup>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
