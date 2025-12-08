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

						<div className="relative my-6">
							<div className="absolute inset-0 flex items-center">
								<span className="w-full border-t" />
							</div>
							<div className="relative flex justify-center text-xs uppercase">
								<span className="bg-background px-2 text-muted-foreground">
									Or continue with
								</span>
							</div>
						</div>

						<div className="flex flex-col gap-3">
							<Button
								variant="outline"
								className="w-full"
								type="button"
							>
								<svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
									<path
										d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
										fill="#4285F4"
									/>
									<path
										d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
										fill="#34A853"
									/>
									<path
										d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
										fill="#FBBC05"
									/>
									<path
										d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
										fill="#EA4335"
									/>
								</svg>
								Continue with Google
							</Button>

							<Button
								variant="outline"
								className="w-full"
								type="button"
							>
								<svg className="mr-2 h-4 w-4" viewBox="0 0 23 23">
									<rect x="1" y="1" width="10" height="10" fill="#F25022" />
									<rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
									<rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
									<rect x="12" y="12" width="10" height="10" fill="#FFB900" />
								</svg>
								Continue with Microsoft
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
