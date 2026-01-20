import { useState } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	Search,
	Reply,
	Link2,
	FileText,
	UserPlus,
	Clock,
	Archive,
	ChevronDown,
	Mail,
	Paperclip,
	File,
	Image,
	FileSpreadsheet,
	Download,
} from 'lucide-react';

type LinkType = 'customer' | 'quote' | 'job' | null;

interface EmailDocument {
	id: string;
	name: string;
	type: 'pdf' | 'image' | 'spreadsheet' | 'document';
	size: string;
}

interface Email {
	id: string;
	sender: string;
	senderEmail: string;
	subject: string;
	preview: string;
	body: string;
	date: string;
	time: string;
	unread: boolean;
	linkType: LinkType;
	linkLabel?: string;
	thread?: { sender: string; body: string; date: string }[];
	documents?: EmailDocument[];
}

const DEMO_EMAILS: Email[] = [
	{
		id: '1',
		sender: 'Sarah Williams',
		senderEmail: 'sarah.williams@email.com',
		subject: 'Inquiry about headstone for my mother',
		preview: 'Hello, I recently lost my mother and I am looking into having a headstone made...',
		body: `Hello,

I recently lost my mother and I am looking into having a headstone made for her grave at St. Mary's Church cemetery.

She always loved roses, and I was wondering if you could incorporate some floral designs into the headstone. I'd also like to know about the different materials available and their costs.

Could you please send me some information about your services and perhaps arrange a time to discuss this further?

Thank you for your time.

Best regards,
Sarah Williams`,
		date: 'Today',
		time: '10:42 AM',
		unread: true,
		linkType: null,
	},
	{
		id: '2',
		sender: 'David Thompson',
		senderEmail: 'david.t@email.com',
		subject: 'RE: Quote #247 - Gold lettering question',
		preview: 'Thank you for sending the quote. I had a quick question about the gold lettering...',
		body: `Hello,

Thank you for sending the quote. I had a quick question about the gold lettering option you mentioned.

Would the gold leaf lettering be suitable for an outdoor memorial, or would you recommend a different finish that would be more weather-resistant?

Also, is there a significant price difference between the gold leaf and the gilded options?

Looking forward to hearing from you.

Best,
David Thompson`,
		date: 'Today',
		time: '9:15 AM',
		unread: true,
		linkType: 'quote',
		linkLabel: 'Quote #247',
		documents: [
			{ id: 'd1', name: 'Quote_247_Thompson.pdf', type: 'pdf', size: '245 KB' },
		],
	},
	{
		id: '3',
		sender: 'Robert Hughes - Hughes Funeral Services',
		senderEmail: 'robert@hughesfunerals.co.uk',
		subject: 'New referral - Thompson family',
		preview: 'Good morning, I have a family who has asked me to recommend a memorial mason...',
		body: `Good morning,

I have a family who has asked me to recommend a memorial mason for their father's headstone.

The Thompson family have requested a traditional style granite headstone with gold lettering. The burial is scheduled for next Thursday at Greenfields Cemetery.

I've given them your details but wanted to give you a heads up. Mrs. Thompson's contact number is 07700 900123.

Please let me know if you need any additional information.

Kind regards,
Robert Hughes
Hughes Funeral Services`,
		date: 'Yesterday',
		time: '4:30 PM',
		unread: false,
		linkType: 'customer',
		linkLabel: 'Thompson Family',
	},
	{
		id: '4',
		sender: 'Mark Peters',
		senderEmail: 'mark.peters@email.com',
		subject: 'Access for Thursday installation',
		preview: 'Just confirming the installation for Thursday. The cemetery gates open at 8am...',
		body: `Hi,

Just confirming the installation for Thursday at Oakwood Cemetery.

The cemetery gates open at 8am and the groundskeeper, John, will meet you at the main entrance. I've arranged for the adjacent plots to be marked off so you'll have room to work.

Please let me know if you need anything else before then.

Thanks,
Mark Peters`,
		date: 'Yesterday',
		time: '2:15 PM',
		unread: false,
		linkType: 'job',
		linkLabel: 'Job #1089',
	},
	{
		id: '5',
		sender: 'Stone Supplies Ltd',
		senderEmail: 'orders@stonesupplies.co.uk',
		subject: 'Marble delivery delayed to next week',
		preview: 'We regret to inform you that the Carrara marble order #SS-4521 has been delayed...',
		body: `Dear Valued Customer,

We regret to inform you that the Carrara marble order #SS-4521 has been delayed due to shipping issues at the port.

The new estimated delivery date is next Wednesday, 15th January.

We apologise for any inconvenience this may cause to your project schedule. Please contact us if you need to make alternative arrangements.

Kind regards,
Orders Team
Stone Supplies Ltd`,
		date: 'Jan 10',
		time: '11:20 AM',
		unread: false,
		linkType: null,
		documents: [
			{ id: 'd2', name: 'Order_SS-4521_Invoice.pdf', type: 'pdf', size: '128 KB' },
			{ id: 'd3', name: 'Delivery_Schedule_Jan2025.xlsx', type: 'spreadsheet', size: '42 KB' },
		],
	},
	{
		id: '6',
		sender: 'Emma Richardson',
		senderEmail: 'emma.r@email.com',
		subject: 'Approved inscription wording',
		preview: 'Hi, we have discussed as a family and would like to confirm the following inscription...',
		body: `Hi,

We have discussed as a family and would like to confirm the following inscription for Dad's headstone:

"In Loving Memory of
JOHN RICHARDSON
1945 - 2024
Beloved Husband, Father and Grandfather
Forever in our hearts"

Please let us know if this fits within the space available. We're happy to proceed with the quote once you confirm.

Thank you for your patience while we made this decision.

Best wishes,
Emma Richardson`,
		date: 'Jan 8',
		time: '3:45 PM',
		unread: false,
		linkType: 'quote',
		linkLabel: 'Quote #243',
		documents: [
			{ id: 'd4', name: 'Richardson_Inscription_Draft.pdf', type: 'pdf', size: '312 KB' },
			{ id: 'd5', name: 'Headstone_Design_Preview.jpg', type: 'image', size: '1.2 MB' },
			{ id: 'd6', name: 'Quote_243_Richardson.pdf', type: 'pdf', size: '198 KB' },
		],
		thread: [
			{
				sender: 'You',
				body: `Hi Emma,

Thank you for your enquiry about the inscription. I've attached a draft design showing how the proposed text would look on the selected headstone style.

Please review with your family and let me know if you'd like any changes.

Best regards`,
				date: 'Jan 5',
			},
			{
				sender: 'Emma Richardson',
				body: `Hello,

Following our meeting last week, I wanted to get back to you about the inscription wording. We're still deciding between a couple of options - I'll be in touch soon.

Thanks,
Emma`,
				date: 'Jan 3',
			},
		],
	},
];

const LINK_COLORS: Record<string, string> = {
	customer: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
	quote: 'bg-green-100 text-green-800 hover:bg-green-100',
	job: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
};

function getInitials(name: string): string {
	return name
		.split(' ')
		.map((n) => n[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();
}

function getDocumentIcon(type: EmailDocument['type']) {
	switch (type) {
		case 'pdf':
			return <File className="h-4 w-4 text-red-500" />;
		case 'image':
			return <Image className="h-4 w-4 text-blue-500" />;
		case 'spreadsheet':
			return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
		default:
			return <FileText className="h-4 w-4 text-gray-500" />;
	}
}

export function InboxPage() {
	const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [filter, setFilter] = useState('all');

	const filteredEmails = DEMO_EMAILS.filter((email) => {
		const matchesSearch =
			email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
			email.sender.toLowerCase().includes(searchQuery.toLowerCase());

		if (filter === 'all') return matchesSearch;
		if (filter === 'customers') return matchesSearch && email.linkType === 'customer';
		if (filter === 'quotes') return matchesSearch && email.linkType === 'quote';
		if (filter === 'jobs') return matchesSearch && email.linkType === 'job';
		if (filter === 'unlinked') return matchesSearch && email.linkType === null;
		return matchesSearch;
	});

	const unreadCount = DEMO_EMAILS.filter((e) => e.unread).length;

	const handleAction = (action: string) => {
		toast.info(`Demo only - ${action} feature coming soon`);
	};

	return (
		<div className="h-[calc(100vh-8rem)]">
			<div className="mb-4">
				<h2 className="text-2xl font-bold">Inbox</h2>
			</div>

			<div className="flex gap-4 h-[calc(100%-4rem)]">
				{/* Left Panel - Email List */}
				<Card className="w-2/5 flex flex-col overflow-hidden">
					<div className="p-4 border-b space-y-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<h3 className="font-semibold">Messages</h3>
								{unreadCount > 0 && (
									<Badge variant="secondary">{unreadCount} unread</Badge>
								)}
							</div>
						</div>
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search emails..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-9"
							/>
						</div>
						<Tabs value={filter} onValueChange={setFilter}>
							<TabsList className="w-full">
								<TabsTrigger value="all" className="flex-1">All</TabsTrigger>
								<TabsTrigger value="customers" className="flex-1">Customers</TabsTrigger>
								<TabsTrigger value="quotes" className="flex-1">Quotes</TabsTrigger>
								<TabsTrigger value="jobs" className="flex-1">Jobs</TabsTrigger>
								<TabsTrigger value="unlinked" className="flex-1">Unlinked</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>

					<div className="flex-1 overflow-y-auto">
						{filteredEmails.length === 0 ? (
							<div className="p-8 text-center text-muted-foreground">
								No emails match your filters
							</div>
						) : (
							filteredEmails.map((email) => (
								<div
									key={email.id}
									onClick={() => setSelectedEmail(email)}
									className={`p-4 border-b cursor-pointer transition-colors ${
										selectedEmail?.id === email.id
											? 'bg-muted border-l-2 border-l-primary'
											: 'hover:bg-muted/50'
									} ${email.unread ? 'bg-blue-50/50' : ''}`}
								>
									<div className="flex items-start gap-3">
										<div className="relative">
											<Avatar className="h-10 w-10">
												<AvatarFallback className="text-xs">
													{getInitials(email.sender)}
												</AvatarFallback>
											</Avatar>
											{email.unread && (
												<div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-blue-500 border-2 border-white" />
											)}
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex items-center justify-between mb-1">
												<span className={`text-sm truncate ${email.unread ? 'font-semibold' : ''}`}>
													{email.sender}
												</span>
												<span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
													{email.date === 'Today' ? email.time : email.date}
												</span>
											</div>
											<p className={`text-sm truncate mb-1 ${email.unread ? 'font-medium' : 'text-muted-foreground'}`}>
												{email.subject}
											</p>
											<p className="text-xs text-muted-foreground truncate">
												{email.preview}
											</p>
											<div className="flex items-center gap-2 mt-2">
												{email.documents && email.documents.length > 0 && (
													<div className="flex items-center gap-1 text-muted-foreground">
														<Paperclip className="h-3 w-3" />
														<span className="text-xs">{email.documents.length}</span>
													</div>
												)}
												{email.linkType && email.linkLabel && (
													<Badge
														variant="secondary"
														className={`text-xs ${LINK_COLORS[email.linkType]}`}
													>
														{email.linkLabel}
													</Badge>
												)}
											</div>
										</div>
									</div>
								</div>
							))
						)}
					</div>
				</Card>

				{/* Right Panel - Email Detail */}
				<Card className="flex-1 flex flex-col overflow-hidden">
					{selectedEmail ? (
						<>
							{/* Email Header */}
							<div className="p-4 border-b">
								<div className="flex items-start justify-between mb-4">
									<h3 className="text-lg font-semibold">{selectedEmail.subject}</h3>
									{selectedEmail.linkType && selectedEmail.linkLabel && (
										<Badge
											variant="secondary"
											className={LINK_COLORS[selectedEmail.linkType]}
										>
											Linked to {selectedEmail.linkLabel}
										</Badge>
									)}
								</div>
								<div className="flex items-center gap-3">
									<Avatar className="h-10 w-10">
										<AvatarFallback>{getInitials(selectedEmail.sender)}</AvatarFallback>
									</Avatar>
									<div className="flex-1">
										<div className="font-medium">{selectedEmail.sender}</div>
										<div className="text-sm text-muted-foreground">
											{selectedEmail.senderEmail}
										</div>
									</div>
									<div className="text-sm text-muted-foreground">
										{selectedEmail.date} at {selectedEmail.time}
									</div>
								</div>
							</div>

							{/* Action Buttons */}
							<div className="p-3 border-b bg-muted/30 flex items-center gap-2 flex-wrap">
								<Button
									variant="outline"
									size="sm"
									onClick={() => handleAction('Reply')}
								>
									<Reply className="h-4 w-4 mr-2" />
									Reply
								</Button>

								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="outline" size="sm">
											<Link2 className="h-4 w-4 mr-2" />
											Link to...
											<ChevronDown className="h-4 w-4 ml-1" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent>
										<DropdownMenuItem onClick={() => handleAction('Link to Customer')}>
											Link to Customer
										</DropdownMenuItem>
										<DropdownMenuItem onClick={() => handleAction('Link to Quote')}>
											Link to Quote
										</DropdownMenuItem>
										<DropdownMenuItem onClick={() => handleAction('Link to Job')}>
											Link to Job
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>

								<Button
									variant="outline"
									size="sm"
									onClick={() => handleAction('Create Quote')}
								>
									<FileText className="h-4 w-4 mr-2" />
									Create Quote
								</Button>

								<Button
									variant="outline"
									size="sm"
									onClick={() => handleAction('Create Customer')}
								>
									<UserPlus className="h-4 w-4 mr-2" />
									Create Customer
								</Button>

								<Button
									variant="outline"
									size="sm"
									onClick={() => handleAction('Schedule Follow-up')}
								>
									<Clock className="h-4 w-4 mr-2" />
									Schedule Follow-up
								</Button>

								<Button
									variant="outline"
									size="sm"
									onClick={() => handleAction('Archive')}
								>
									<Archive className="h-4 w-4 mr-2" />
									Archive
								</Button>
							</div>

							{/* Attachments */}
							{selectedEmail.documents && selectedEmail.documents.length > 0 && (
								<div className="px-6 py-3 border-b bg-muted/20">
									<div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
										<Paperclip className="h-4 w-4" />
										<span>{selectedEmail.documents.length} attachment{selectedEmail.documents.length > 1 ? 's' : ''}</span>
									</div>
									<div className="flex flex-wrap gap-2">
										{selectedEmail.documents.map((doc) => (
											<button
												key={doc.id}
												onClick={() => handleAction(`Download ${doc.name}`)}
												className="flex items-center gap-2 px-3 py-2 bg-background border rounded-lg hover:bg-muted/50 transition-colors group"
											>
												{getDocumentIcon(doc.type)}
												<div className="text-left">
													<p className="text-sm font-medium truncate max-w-[180px]">{doc.name}</p>
													<p className="text-xs text-muted-foreground">{doc.size}</p>
												</div>
												<Download className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
											</button>
										))}
									</div>
								</div>
							)}

							{/* Email Body */}
							<div className="flex-1 overflow-y-auto p-6">
								<div className="prose prose-sm max-w-none">
									<pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed bg-transparent border-0 p-0">
										{selectedEmail.body}
									</pre>
								</div>

								{/* Thread History */}
								{selectedEmail.thread && selectedEmail.thread.length > 0 && (
									<div className="mt-8">
										<Separator className="mb-6" />
										<h4 className="text-sm font-medium text-muted-foreground mb-4">
											Earlier in this conversation
										</h4>
										<div className="space-y-4">
											{selectedEmail.thread.map((message, index) => (
												<div
													key={index}
													className="bg-muted/50 rounded-lg p-4 border"
												>
													<div className="flex items-center justify-between mb-2">
														<span className="font-medium text-sm">{message.sender}</span>
														<span className="text-xs text-muted-foreground">
															{message.date}
														</span>
													</div>
													<pre className="whitespace-pre-wrap font-sans text-sm text-muted-foreground leading-relaxed">
														{message.body}
													</pre>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						</>
					) : (
						<div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
							<Mail className="h-16 w-16 mb-4 opacity-20" />
							<p className="text-lg font-medium">Select an email to view</p>
							<p className="text-sm">Choose from the list on the left</p>
						</div>
					)}
				</Card>
			</div>
		</div>
	);
}
