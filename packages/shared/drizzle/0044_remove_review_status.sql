-- Migrate any quotes in 'review' status back to 'draft'
UPDATE quote_packages SET status = 'draft', updated_at = NOW() WHERE status = 'review';--> statement-breakpoint
UPDATE quotes SET status = 'draft', updated_at = NOW() WHERE status = 'review';