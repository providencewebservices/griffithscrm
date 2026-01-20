import { Link } from 'react-router';
import { FileText, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePipelineQuery } from '@/hooks/use-pipeline';
import { useIsMobile } from '@/hooks/use-mobile';
import { PipelineQuoteColumn, PipelineJobColumn } from './pipeline-column';

export function PipelineBoard() {
	const { data, isLoading, error } = usePipelineQuery();
	const isMobile = useIsMobile();

	if (isLoading) {
		return (
			<div className="space-y-6">
				<Card>
					<CardHeader className="pb-3">
						<div className="flex items-center gap-2">
							<div className="h-5 w-5 rounded bg-muted animate-pulse" />
							<div className="h-5 w-32 rounded bg-muted animate-pulse" />
						</div>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-4 gap-3">
							{[1, 2, 3, 4].map((i) => (
								<div key={i} className="h-48 bg-muted/50 rounded-lg animate-pulse" />
							))}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-3">
						<div className="flex items-center gap-2">
							<div className="h-5 w-5 rounded bg-muted animate-pulse" />
							<div className="h-5 w-28 rounded bg-muted animate-pulse" />
						</div>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-5 gap-3">
							{[1, 2, 3, 4, 5].map((i) => (
								<div key={i} className="h-48 bg-muted/50 rounded-lg animate-pulse" />
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (error) {
		return (
			<Card>
				<CardContent className="p-6">
					<p className="text-destructive">
						Error loading pipeline: {error.message}
					</p>
				</CardContent>
			</Card>
		);
	}

	if (!data) {
		return null;
	}

	return (
		<div className="space-y-6">
			{/* Quote Pipeline */}
			<Card>
				<CardHeader className="pb-4">
					<div className="flex items-center justify-between">
						<CardTitle className="text-lg font-display font-bold flex items-center gap-2">
							<FileText className="h-5 w-5 text-blue-600" />
							Quote Pipeline
						</CardTitle>
						<Link to="/app/quotes">
							<Button variant="outline" size="sm" className="text-xs">
								View All Quotes
							</Button>
						</Link>
					</div>
				</CardHeader>
				<CardContent className="pt-0">
					{isMobile ? (
						<Tabs defaultValue={data.quotes.columns[0]?.id}>
							<TabsList className="w-full overflow-x-auto justify-start mb-4">
								{data.quotes.columns.map((column) => (
									<TabsTrigger key={column.id} value={column.id} className="flex-shrink-0 gap-1.5">
										<span className={`w-2 h-2 rounded-full ${column.color}`} />
										{column.label}
										<span className="text-muted-foreground">({column.count})</span>
									</TabsTrigger>
								))}
							</TabsList>
							{data.quotes.columns.map((column) => (
								<TabsContent key={column.id} value={column.id} className="mt-0">
									<PipelineQuoteColumn column={column} />
								</TabsContent>
							))}
						</Tabs>
					) : (
						<div className="grid grid-cols-4 gap-3">
							{data.quotes.columns.map((column) => (
								<PipelineQuoteColumn key={column.id} column={column} />
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Job Pipeline */}
			<Card>
				<CardHeader className="pb-4">
					<div className="flex items-center justify-between">
						<CardTitle className="text-lg font-display font-bold flex items-center gap-2">
							<Briefcase className="h-5 w-5 text-green-600" />
							Job Pipeline
						</CardTitle>
						<Link to="/app/jobs">
							<Button variant="outline" size="sm" className="text-xs">
								View All Jobs
							</Button>
						</Link>
					</div>
				</CardHeader>
				<CardContent className="pt-0">
					{isMobile ? (
						<Tabs defaultValue={data.jobs.columns[0]?.id}>
							<TabsList className="w-full overflow-x-auto justify-start mb-4">
								{data.jobs.columns.map((column) => (
									<TabsTrigger key={column.id} value={column.id} className="flex-shrink-0 gap-1.5">
										<span className={`w-2 h-2 rounded-full ${column.color}`} />
										{column.label}
										<span className="text-muted-foreground">({column.count})</span>
									</TabsTrigger>
								))}
							</TabsList>
							{data.jobs.columns.map((column) => (
								<TabsContent key={column.id} value={column.id} className="mt-0">
									<PipelineJobColumn column={column} />
								</TabsContent>
							))}
						</Tabs>
					) : (
						<div className="grid grid-cols-5 gap-3">
							{data.jobs.columns.map((column) => (
								<PipelineJobColumn key={column.id} column={column} />
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
