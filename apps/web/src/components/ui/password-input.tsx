import { Eye, EyeOff } from 'lucide-react';
import type * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function PasswordInput({ className, ...props }: Omit<React.ComponentProps<'input'>, 'type'>) {
	const [showPassword, setShowPassword] = useState(false);

	return (
		<div className="relative">
			<Input
				type={showPassword ? 'text' : 'password'}
				className={cn('pr-10', className)}
				{...props}
			/>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				tabIndex={-1}
				className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground"
				onClick={() => setShowPassword(!showPassword)}
			>
				{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
			</Button>
		</div>
	);
}

export { PasswordInput };
