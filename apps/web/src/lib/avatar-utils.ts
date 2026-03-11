const AVATAR_COLORS = [
	'hsl(210, 40%, 78%)',
	'hsl(160, 40%, 75%)',
	'hsl(280, 35%, 78%)',
	'hsl(340, 40%, 78%)',
	'hsl(30, 50%, 78%)',
	'hsl(200, 45%, 75%)',
	'hsl(120, 30%, 75%)',
	'hsl(250, 35%, 78%)',
];

function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) - hash + str.charCodeAt(i);
		hash |= 0;
	}
	return Math.abs(hash);
}

export function getAvatarColor(name: string): string {
	return AVATAR_COLORS[hashString(name) % AVATAR_COLORS.length];
}

export function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 2) {
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	}
	return name.slice(0, 2).toUpperCase();
}
