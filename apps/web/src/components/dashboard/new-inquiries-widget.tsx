import { MessageSquareText } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatTimeAgo, useDashboardQuery } from '@/hooks/use-dashboard';

const SOURCE_LABELS: Record<string, string> = {
	walk_in: 'Walk-in',
	phone: 'Phone',
	email: 'Email',
	website: 'Website',
	facebook: 'Facebook',
	instagram: 'Instagram',
	whatsapp: 'WhatsApp',
	referral: 'Referral',
	other: 'Other',
};

export function NewInquiriesWidget() {
	const { data: stats } = useDashboardQuery();

	if (!stats?.inquiries) return null;

	const { newCount, recent } = stats.inquiries;

	return (
		<Card className="h-full">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-base font-semibold flex items-center gap-2">
						<MessageSquareText className="h-4 w-4" />
						New Inquiries
					</CardTitle>
					{newCount > 0 && (
						<Badge variant="default" className="text-xs">
							{newCount}
						</Badge>
					)}
				</div>
			</CardHeader>
			<CardContent>
				{recent.length === 0 ? (
					<p className="text-sm text-muted-foreground text-center py-4">
						No recent inquiries
					</p>
				) : (
					<div className="space-y-1">
						{recent.map((inquiry) => (
							<Link
								key={inquiry.id}
								to={`/app/inquiries/${inquiry.id}`}
								className="flex items-center gap-3 py-1.5 px-1 rounded-md hover:bg-muted/50"
							>
								<span className="w-2 h-2 rounded-full shrink-0 bg-amber-400" />
								<span className="text-sm font-medium truncate flex-1 min-w-0">
									{inquiry.firstName} {inquiry.lastName}
								</span>
								<span className="text-xs text-muted-foreground shrink-0">
									{SOURCE_LABELS[inquiry.source] || inquiry.source}
								</span>
								<span className="text-xs text-muted-foreground shrink-0">
									{formatTimeAgo(inquiry.createdAt)}
								</span>
							</Link>
						))}
					</div>
				)}
				<div className="mt-3 pt-3 border-t">
					<Link to="/app/inquiries?status=new">
						<Button variant="ghost" size="sm" className="w-full text-xs">
							View All Inquiries
						</Button>
					</Link>
				</div>
			</CardContent>
		</Card>
	);
}
