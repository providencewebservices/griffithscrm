import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatMonthYear, format } from './calendar-utils';
import type { CalendarView } from './types';

type CalendarHeaderProps = {
	currentDate: Date;
	view: CalendarView;
	onViewChange: (view: CalendarView) => void;
	onPrevious: () => void;
	onNext: () => void;
	onToday: () => void;
};

export function CalendarHeader({
	currentDate,
	view,
	onViewChange,
	onPrevious,
	onNext,
	onToday,
}: CalendarHeaderProps) {
	// Format the title based on current view
	const getTitle = () => {
		switch (view) {
			case 'month':
				return formatMonthYear(currentDate);
			case 'week':
				return formatMonthYear(currentDate);
			case 'day':
				return format(currentDate, 'EEEE, MMMM d, yyyy');
			default:
				return formatMonthYear(currentDate);
		}
	};

	return (
		<div className="flex items-center justify-between px-4 py-3 border-b bg-card">
			<div className="flex items-center gap-2">
				<Button
					variant="outline"
					size="icon"
					onClick={onPrevious}
					aria-label="Previous"
				>
					<ChevronLeft className="h-4 w-4" />
				</Button>
				<Button variant="outline" size="sm" onClick={onToday}>
					Today
				</Button>
				<Button
					variant="outline"
					size="icon"
					onClick={onNext}
					aria-label="Next"
				>
					<ChevronRight className="h-4 w-4" />
				</Button>
				<h2 className="text-lg font-semibold ml-4">{getTitle()}</h2>
			</div>

			<Tabs
				value={view}
				onValueChange={(v) => onViewChange(v as CalendarView)}
			>
				<TabsList>
					<TabsTrigger value="month">Month</TabsTrigger>
					<TabsTrigger value="week">Week</TabsTrigger>
					<TabsTrigger value="day">Day</TabsTrigger>
				</TabsList>
			</Tabs>
		</div>
	);
}
