// Component types from schema
export const COMPONENT_TYPES = [
	'headstone',
	'base',
	'vase',
	'kerb',
	'book',
	'post',
	'column',
	'capping_piece',
	'rest',
	'cross',
	'die',
	'tablet',
	'slab',
	'desk',
	'heart',
	'gate',
	'flat_tablet',
	'candle_box',
	'riser',
	'filler',
	'wing',
	'piece',
	'wedge',
	'desk_headstone',
	'column_cap',
	'plaque',
] as const;

// Human-readable labels for component types
export const COMPONENT_TYPE_LABELS: Record<string, string> = {
	headstone: 'Headstone',
	base: 'Base',
	vase: 'Vase',
	kerb: 'Kerb',
	book: 'Book',
	post: 'Post',
	column: 'Column',
	capping_piece: 'Capping Piece',
	rest: 'Rest',
	cross: 'Cross',
	die: 'Die',
	tablet: 'Tablet',
	slab: 'Slab',
	desk: 'Desk',
	heart: 'Heart',
	gate: 'Gate',
	flat_tablet: 'Flat Tablet',
	candle_box: 'Candle Box',
	riser: 'Riser',
	filler: 'Filler',
	wing: 'Wing',
	piece: 'Piece',
	wedge: 'Wedge',
	desk_headstone: 'Desk Headstone',
	column_cap: 'Column Cap',
	plaque: 'Plaque',
};

// Dimension labels by component type
export const COMPONENT_DIMENSION_LABELS: Record<string, [string, string, string]> = {
	headstone: ['Height', 'Width', 'Thickness'],
	base: ['Thickness', 'Width', 'Depth'],
	vase: ['Height', 'Diameter', 'Depth'],
	kerb: ['Height', 'Width', 'Depth'],
	book: ['Height', 'Width', 'Thickness'],
	post: ['Height', 'Width', 'Depth'],
	column: ['Height', 'Width', 'Depth'],
	capping_piece: ['Height', 'Width', 'Depth'],
	rest: ['Height', 'Width', 'Depth'],
	cross: ['Height', 'Width', 'Thickness'],
	die: ['Height', 'Width', 'Thickness'],
	tablet: ['Height', 'Width', 'Thickness'],
	slab: ['Height', 'Width', 'Thickness'],
	desk: ['Height', 'Width', 'Depth'],
	heart: ['Height', 'Width', 'Thickness'],
	gate: ['Height', 'Width', 'Depth'],
	flat_tablet: ['Height', 'Width', 'Thickness'],
	candle_box: ['Height', 'Width', 'Depth'],
	riser: ['Height', 'Width', 'Depth'],
	filler: ['Height', 'Width', 'Depth'],
	wing: ['Height', 'Width', 'Thickness'],
	piece: ['Height', 'Width', 'Depth'],
	wedge: ['Height', 'Width', 'Depth'],
	desk_headstone: ['Height', 'Width', 'Thickness'],
	column_cap: ['Height', 'Width', 'Depth'],
	plaque: ['Height', 'Width', 'Thickness'],
	default: ['Height', 'Width', 'Depth'],
};

export function getDimensionLabels(componentType: string): [string, string, string] {
	return COMPONENT_DIMENSION_LABELS[componentType] || COMPONENT_DIMENSION_LABELS.default;
}

export function formatPriceAdjustment(price: string): string {
	const num = parseFloat(price);
	if (num === 0) return '-';
	return num > 0 ? `+£${num.toFixed(2)}` : `-£${Math.abs(num).toFixed(2)}`;
}
