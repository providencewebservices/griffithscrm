import { useState, useEffect, useCallback } from 'react';
import type { DocumentEntityType } from './use-documents';

const STORAGE_KEY = 'griffiths_recent_entities';
const MAX_RECENT_ENTITIES = 10;

export interface RecentEntity {
	type: DocumentEntityType;
	id: string;
	label: string;
	timestamp: number;
}

/**
 * Hook to manage recently accessed entities for quick selection in document uploads.
 * Stores entities in localStorage and provides methods to add and retrieve them.
 */
export function useRecentEntities() {
	const [recentEntities, setRecentEntities] = useState<RecentEntity[]>([]);

	// Load from localStorage on mount
	useEffect(() => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored) as RecentEntity[];
				// Filter out any invalid or expired entries (older than 30 days)
				const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
				const valid = parsed.filter((e) => e.timestamp > thirtyDaysAgo);
				setRecentEntities(valid);
			}
		} catch (error) {
			console.error('Failed to load recent entities:', error);
			setRecentEntities([]);
		}
	}, []);

	// Save to localStorage whenever recentEntities changes
	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(recentEntities));
		} catch (error) {
			console.error('Failed to save recent entities:', error);
		}
	}, [recentEntities]);

	/**
	 * Add a recently accessed entity to the list.
	 * If the entity already exists, it will be moved to the front.
	 */
	const addRecentEntity = useCallback(
		(type: DocumentEntityType, id: string, label: string) => {
			setRecentEntities((prev) => {
				// Remove existing entry for this entity if present
				const filtered = prev.filter(
					(e) => !(e.type === type && e.id === id)
				);

				// Add new entry at the front
				const newEntity: RecentEntity = {
					type,
					id,
					label,
					timestamp: Date.now(),
				};

				// Keep only the most recent entries
				return [newEntity, ...filtered].slice(0, MAX_RECENT_ENTITIES);
			});
		},
		[]
	);

	/**
	 * Clear all recent entities.
	 */
	const clearRecentEntities = useCallback(() => {
		setRecentEntities([]);
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch (error) {
			console.error('Failed to clear recent entities:', error);
		}
	}, []);

	return {
		// Return only the first 5 for display in quick-select
		recentEntities: recentEntities.slice(0, 5),
		allRecentEntities: recentEntities,
		addRecentEntity,
		clearRecentEntities,
	};
}
