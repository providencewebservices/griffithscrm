// Production drizzle config for migrations
// Used by docker-entrypoint.sh to run migrations on container startup

/** @type {import('drizzle-kit').Config} */
export default {
  dialect: 'postgresql',
  out: '/app/drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
};
