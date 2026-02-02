import { useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Bold,
	Italic,
	Underline as UnderlineIcon,
	Link as LinkIcon,
	List,
	ListOrdered,
	Paperclip,
	X,
	File,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Attachment {
	id: string;
	file: File;
	name: string;
	size: string;
}

interface ComposeEmailDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSend: (data: { to: string; subject: string; body: string; attachments: File[] }) => void;
	defaultTo?: string;
	defaultSubject?: string;
	defaultBody?: string;
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ToolbarButton({
	onClick,
	active,
	disabled,
	children,
	title,
}: {
	onClick: () => void;
	active?: boolean;
	disabled?: boolean;
	children: React.ReactNode;
	title: string;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			title={title}
			className={cn(
				'p-1.5 rounded hover:bg-muted transition-colors',
				active && 'bg-muted text-primary',
				disabled && 'opacity-50 cursor-not-allowed'
			)}
		>
			{children}
		</button>
	);
}

export function ComposeEmailDialog({
	open,
	onOpenChange,
	onSend,
	defaultTo = '',
	defaultSubject = '',
	defaultBody = '',
}: ComposeEmailDialogProps) {
	const [to, setTo] = useState(defaultTo);
	const [subject, setSubject] = useState(defaultSubject);
	const [attachments, setAttachments] = useState<Attachment[]>([]);
	const [isSending, setIsSending] = useState(false);
	// Force re-render when editor state changes (for toolbar active states)
	const [, setEditorVersion] = useState(0);

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				bulletList: {
					keepMarks: true,
					keepAttributes: false,
				},
				orderedList: {
					keepMarks: true,
					keepAttributes: false,
				},
			}),
			Link.configure({
				openOnClick: false,
				HTMLAttributes: {
					class: 'text-primary underline',
				},
			}),
			Underline,
		],
		content: defaultBody,
		onUpdate: () => setEditorVersion((v) => v + 1),
		onSelectionUpdate: () => setEditorVersion((v) => v + 1),
		editorProps: {
			attributes: {
				class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-3',
			},
		},
	});

	// Reset form when dialog opens with new defaults
	const handleOpenChange = useCallback(
		(isOpen: boolean) => {
			if (isOpen) {
				setTo(defaultTo);
				setSubject(defaultSubject);
				setAttachments([]);
				editor?.commands.setContent(defaultBody);
			}
			onOpenChange(isOpen);
		},
		[defaultTo, defaultSubject, defaultBody, editor, onOpenChange]
	);

	const handleAddLink = useCallback(() => {
		if (!editor) return;
		const previousUrl = editor.getAttributes('link').href;
		const url = window.prompt('Enter URL:', previousUrl || 'https://');
		if (url === null) return;
		if (url === '') {
			editor.chain().focus().extendMarkRange('link').unsetLink().run();
			return;
		}
		editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
	}, [editor]);

	const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files) return;

		const newAttachments: Attachment[] = Array.from(files).map((file) => ({
			id: crypto.randomUUID(),
			file,
			name: file.name,
			size: formatFileSize(file.size),
		}));

		setAttachments((prev) => [...prev, ...newAttachments]);
		e.target.value = '';
	}, []);

	const handleRemoveAttachment = useCallback((id: string) => {
		setAttachments((prev) => prev.filter((a) => a.id !== id));
	}, []);

	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			if (!to.trim() || !subject.trim()) return;

			setIsSending(true);
			try {
				await onSend({
					to: to.trim(),
					subject: subject.trim(),
					body: editor?.getHTML() || '',
					attachments: attachments.map((a) => a.file),
				});
				handleOpenChange(false);
			} finally {
				setIsSending(false);
			}
		},
		[to, subject, editor, attachments, onSend, handleOpenChange]
	);

	const canSend = to.trim() && subject.trim();

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>Compose Email</DialogTitle>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
					<div className="space-y-3">
						<div className="flex items-center gap-2">
							<label htmlFor="to" className="text-sm font-medium w-16">
								To:
							</label>
							<Input
								id="to"
								type="email"
								value={to}
								onChange={(e) => setTo(e.target.value)}
								placeholder="recipient@example.com"
								className="flex-1"
								required
							/>
						</div>

						<div className="flex items-center gap-2">
							<label htmlFor="subject" className="text-sm font-medium w-16">
								Subject:
							</label>
							<Input
								id="subject"
								type="text"
								value={subject}
								onChange={(e) => setSubject(e.target.value)}
								placeholder="Email subject"
								className="flex-1"
								required
							/>
						</div>
					</div>

					{/* Toolbar */}
					<div className="flex items-center gap-1 border-b py-2 mt-4">
						<ToolbarButton
							onClick={() => editor?.chain().focus().toggleBold().run()}
							active={editor?.isActive('bold')}
							disabled={!editor}
							title="Bold"
						>
							<Bold className="h-4 w-4" />
						</ToolbarButton>
						<ToolbarButton
							onClick={() => editor?.chain().focus().toggleItalic().run()}
							active={editor?.isActive('italic')}
							disabled={!editor}
							title="Italic"
						>
							<Italic className="h-4 w-4" />
						</ToolbarButton>
						<ToolbarButton
							onClick={() => editor?.chain().focus().toggleUnderline().run()}
							active={editor?.isActive('underline')}
							disabled={!editor}
							title="Underline"
						>
							<UnderlineIcon className="h-4 w-4" />
						</ToolbarButton>
						<div className="w-px h-4 bg-border mx-1" />
						<ToolbarButton
							onClick={handleAddLink}
							active={editor?.isActive('link')}
							disabled={!editor}
							title="Add Link"
						>
							<LinkIcon className="h-4 w-4" />
						</ToolbarButton>
						<div className="w-px h-4 bg-border mx-1" />
						<ToolbarButton
							onClick={() => editor?.chain().focus().toggleBulletList().run()}
							active={editor?.isActive('bulletList')}
							disabled={!editor}
							title="Bullet List"
						>
							<List className="h-4 w-4" />
						</ToolbarButton>
						<ToolbarButton
							onClick={() => editor?.chain().focus().toggleOrderedList().run()}
							active={editor?.isActive('orderedList')}
							disabled={!editor}
							title="Numbered List"
						>
							<ListOrdered className="h-4 w-4" />
						</ToolbarButton>
					</div>

					{/* Editor */}
					<div className="flex-1 overflow-y-auto border rounded-md mt-2 min-h-[200px] max-h-[300px]">
						<EditorContent editor={editor} />
					</div>

					{/* Attachments */}
					{attachments.length > 0 && (
						<div className="mt-3 space-y-2">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Paperclip className="h-4 w-4" />
								<span>
									{attachments.length} attachment{attachments.length > 1 ? 's' : ''}
								</span>
							</div>
							<div className="flex flex-wrap gap-2">
								{attachments.map((attachment) => (
									<div
										key={attachment.id}
										className="flex items-center gap-2 px-2 py-1 bg-muted rounded-md text-sm"
									>
										<File className="h-3 w-3 text-muted-foreground" />
										<span className="max-w-[150px] truncate">{attachment.name}</span>
										<span className="text-muted-foreground text-xs">
											({attachment.size})
										</span>
										<button
											type="button"
											onClick={() => handleRemoveAttachment(attachment.id)}
											className="p-0.5 hover:bg-background rounded"
										>
											<X className="h-3 w-3" />
										</button>
									</div>
								))}
							</div>
						</div>
					)}

					<DialogFooter className="mt-4 flex-row justify-between sm:justify-between">
						<div>
							<input
								type="file"
								id="attachment-input"
								multiple
								onChange={handleFileSelect}
								className="hidden"
							/>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => document.getElementById('attachment-input')?.click()}
							>
								<Paperclip className="h-4 w-4 mr-2" />
								Attach Files
							</Button>
						</div>
						<div className="flex gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => handleOpenChange(false)}
								disabled={isSending}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={!canSend || isSending}>
								{isSending ? 'Sending...' : 'Send'}
							</Button>
						</div>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
