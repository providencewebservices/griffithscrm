import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { authClient } from '@/lib/auth';
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

export function ResetPasswordPage() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();

	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const token = searchParams.get('token');
	const urlError = searchParams.get('error');

	useEffect(() => {
		if (urlError === 'INVALID_TOKEN') {
			setError('This password reset link is invalid or has expired. Please request a new one.');
		}
	}, [urlError]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (!token) {
			setError('Missing reset token. Please use the link from your email.');
			return;
		}

		if (password !== confirmPassword) {
			setError('Passwords do not match');
			return;
		}

		if (password.length < 8) {
			setError('Password must be at least 8 characters');
			return;
		}

		setIsLoading(true);

		try {
			const { error: resetError } = await authClient.resetPassword({
				newPassword: password,
				token,
			});

			if (resetError) {
				setError(resetError.message || 'Failed to reset password');
			} else {
				navigate('/login', {
					replace: true,
					state: { message: 'Password set successfully. You can now sign in.' }
				});
			}
		} catch (err) {
			setError('An unexpected error occurred');
			console.error('Reset password error:', err);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			<div className="w-full max-w-sm">
				<Card>
					<CardHeader>
						<CardTitle>Set Your Password</CardTitle>
						<CardDescription>Enter your new password below</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit}>
							<FieldGroup>
								{error && (
									<FieldError>{error}</FieldError>
								)}
								<Field>
									<FieldLabel htmlFor="password">New Password</FieldLabel>
									<Input
										id="password"
										type="password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										required
										autoComplete="new-password"
										minLength={8}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
									<Input
										id="confirmPassword"
										type="password"
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										required
										autoComplete="new-password"
									/>
								</Field>
								<Field>
									<Button type="submit" disabled={isLoading || !token} className="w-full">
										{isLoading ? 'Setting password...' : 'Set Password'}
									</Button>
								</Field>
							</FieldGroup>
						</form>

						<p className="mt-6 text-center text-sm text-muted-foreground">
							After setting your password, you can sign in with Google or Microsoft on the login page.
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
