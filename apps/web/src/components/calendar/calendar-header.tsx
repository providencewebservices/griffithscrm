import { ChevronLeft, ChevronRight, Filter, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, formatMonthYear } from './calendar-utils';
import type { CalendarView, EventSource } from './types';
import { EVENT_SOURCE_LABELS } from './types';

const ALL_EVENT_TYPES: EventSource[] = [
	'custom',
	'quote_valid_until',
	'job_installation',
	'job_deadline',
	'time_off',
];

type CalendarHeaderProps = {
	currentDate: Date;
	view: CalendarView;
	onViewChange: (view: CalendarView) => void;
	onPrevious: () => void;
	onNext: () => void;
	onToday: () => void;
	onCreateEvent?: () => void;
	enabledTypes?: EventSource[];
	onTypesChange?: (types: EventSource[]) => void;
};

export function CalendarHeader({
	currentDate,
	view,
	onViewChange,
	onPrevious,
	onNext,
	onToday,
	onCreateEvent,
	enabledTypes,
	onTypesChange,
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

	const filterCount =
		enabledTypes && enabledTypes.length < ALL_EVENT_TYPES.length
			? ALL_EVENT_TYPES.length - enabledTypes.length
			: 0;

	const handleTypeToggle = (type: EventSource, checked: boolean) => {
		if (!enabledTypes || !onTypesChange) return;
		if (checked) {
			onTypesChange([...enabledTypes, type]);
		} else {
			// Don't allow deselecting all types
			if (enabledTypes.length > 1) {
				onTypesChange(enabledTypes.filter((t) => t !== type));
			}
		}
	};

	return (
		<div className="flex items-center justify-between px-4 py-3 border-b bg-card">
			<div className="flex items-center gap-2">
				<Button variant="outline" size="icon" onClick={onPrevious} aria-label="Previous">
					<ChevronLeft className="h-4 w-4" />
				</Button>
				<Button variant="outline" size="sm" onClick={onToday}>
					Today
				</Button>
				<Button variant="outline" size="icon" onClick={onNext} aria-label="Next">
					<ChevronRight className="h-4 w-4" />
				</Button>
				<h2 className="text-lg font-semibold ml-4">{getTitle()}</h2>
			</div>

			<div className="flex items-center gap-2">
				{enabledTypes && onTypesChange && (
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="outline" size="sm" className="relative">
								<Filter className="h-3.5 w-3.5 mr-1.5" />
								Filter
								{filterCount > 0 && (
									<Badge
										variant="secondary"
										className="ml-1.5 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
									>
										{filterCount}
									</Badge>
								)}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-56" align="end">
							<div className="space-y-3">
								<div className="text-sm font-medium">Event Types</div>
								{ALL_EVENT_TYPES.map((type) => (
									<div key={type} className="flex items-center space-x-2">
										<Checkbox
											id={`filter-${type}`}
											checked={enabledTypes.includes(type)}
											onCheckedChange={(checked) => handleTypeToggle(type, checked === true)}
										/>
										<Label
											htmlFor={`filter-${type}`}
											className="text-sm font-normal cursor-pointer"
										>
											{EVENT_SOURCE_LABELS[type]}
										</Label>
									</div>
								))}
							</div>
						</PopoverContent>
					</Popover>
				)}

				<Tabs value={view} onValueChange={(v) => onViewChange(v as CalendarView)}>
					<TabsList>
						<TabsTrigger value="month">Month</TabsTrigger>
						<TabsTrigger value="week">Week</TabsTrigger>
						<TabsTrigger value="day">Day</TabsTrigger>
					</TabsList>
				</Tabs>

				{onCreateEvent && (
					<Button size="sm" onClick={onCreateEvent}>
						<Plus className="h-4 w-4 mr-1.5" />
						New Event
					</Button>
				)}
			</div>
		</div>
	);
}
