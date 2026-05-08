import {
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type SortableProduct = {
	productId: string;
	name: string;
	imageUrl: string | null;
	categoryName: string | null;
};

function SortableItem({
	product,
	imageUrl,
	onRemove,
}: {
	product: SortableProduct;
	imageUrl: string | null;
	onRemove: () => void;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: product.productId,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`flex items-center gap-3 py-2.5 bg-background ${isDragging ? 'z-10 shadow-md rounded-lg border px-3 opacity-90' : ''}`}
		>
			<button
				type="button"
				className="shrink-0 cursor-grab active:cursor-grabbing touch-manipulation text-muted-foreground hover:text-foreground transition-colors"
				{...attributes}
				{...listeners}
			>
				<GripVertical className="h-4 w-4" />
			</button>
			{imageUrl ? (
				<img
					src={imageUrl}
					alt={product.name}
					className="h-16 w-16 rounded object-cover shrink-0"
				/>
			) : (
				<div className="h-16 w-16 rounded bg-muted shrink-0" />
			)}
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium truncate">{product.name}</p>
				{product.categoryName && (
					<p className="text-xs text-muted-foreground">{product.categoryName}</p>
				)}
			</div>
			<Button
				variant="ghost"
				size="icon"
				className="h-7 w-7 text-destructive hover:text-destructive"
				onClick={onRemove}
			>
				<X className="h-3.5 w-3.5" />
			</Button>
		</div>
	);
}

export function SortableProductList<T extends SortableProduct>({
	products,
	signedUrls,
	onReorder,
	onRemove,
}: {
	products: T[];
	signedUrls: Map<string, string> | undefined;
	onReorder: (products: T[]) => void;
	onRemove: (productId: string) => void;
}) {
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = products.findIndex((p) => p.productId === active.id);
		const newIndex = products.findIndex((p) => p.productId === over.id);
		if (oldIndex === -1 || newIndex === -1) return;

		const next = [...products];
		const [moved] = next.splice(oldIndex, 1);
		next.splice(newIndex, 0, moved);
		onReorder(next);
	}

	return (
		<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
			<SortableContext
				items={products.map((p) => p.productId)}
				strategy={verticalListSortingStrategy}
			>
				<div className="divide-y divide-border/60">
					{products.map((product) => {
						const url = (product.imageUrl ? signedUrls?.get(product.imageUrl) : null) ?? null;
						return (
							<SortableItem
								key={product.productId}
								product={product}
								imageUrl={url}
								onRemove={() => onRemove(product.productId)}
							/>
						);
					})}
				</div>
			</SortableContext>
		</DndContext>
	);
}
