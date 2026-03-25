/**
 * Seed Script - Generate realistic test data using Faker.js
 *
 * Usage:
 *   bun run db:seed                    # Additive - skips existing data
 *   SEED_CLEAR=true bun run db:seed    # Clear tenant data and regenerate
 *
 * Data volumes:
 *   - 1 demo tenant
 *   - 75 customers
 *   - 10 suppliers
 *   - 12 funeral directors
 *   - 18 memorial sites
 *   - 12 products with options
 *   - 6 material sections, 18 materials
 *   - 6 finishes
 *   - 5 lettering techniques, 6 colors
 *   - 12 sundries, 8 line item presets
 *   - 40 quotes (various statuses)
 *   - 15 jobs with payment schedules
 */

import { resolve } from 'node:path';
import { faker } from '@faker-js/faker/locale/en_GB';
import { config } from 'dotenv';
import { and, eq } from 'drizzle-orm';

// Load .env
config({ path: resolve(import.meta.dir, '../../../.env') });

// Import auth for creating demo user
const { auth } = await import('../src/lib/auth');
const { createDb } = await import('@griffiths-crm/shared/db');
const {
	tenants,
	users,
	customers,
	addresses,
	contactInfo,
	customerAddresses,
	customerContactInfo,
	suppliers,
	supplierAddresses,
	supplierContactInfo,
	funeralDirectors,
	funeralDirectorAddresses,
	funeralDirectorContactInfo,
	councils,
	councilAddresses,
	councilContactInfo,
	memorialSites,
	memorialSiteAddresses,
	memorialSiteContactInfo,
	productCategories,
	products,
	productOptions,
	optionChoices,
	productComponents,
	dimensionCombos,
	dimensionComboValues,
	materialSections,
	materials,
	finishes,
	letteringTechniques,
	letteringColors,
	letteringCosts,
	sundries,
	lineItemPresets,
	tenantPricingSettings,
	quotePackages,
	quotes,
	quoteComponents,
	quoteLettering,
	quoteSundries,
	quoteLineItems,
	jobs,
	jobPaymentScheduleItems,
} = await import('@griffiths-crm/shared/db/schema');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	console.error('ERROR: DATABASE_URL environment variable is required');
	process.exit(1);
}

const db = createDb(DATABASE_URL);

// Set fixed seed for reproducibility
faker.seed(12345);

// Helper to generate IDs
const id = () => faker.string.uuid();

// UK-specific phone number generators
const ukLandline = () => {
	const areaCodes = [
		'01onal',
		'0151',
		'0161',
		'0113',
		'0121',
		'0114',
		'0117',
		'0118',
		'0131',
		'0141',
	];
	const area = faker.helpers.arrayElement(areaCodes);
	const rest = faker.string.numeric(7);
	return `${area} ${rest.slice(0, 3)} ${rest.slice(3)}`;
};

const ukMobile = () => {
	const prefix = faker.helpers.arrayElement(['07700', '07711', '07722', '07733', '07744', '07755']);
	const rest = faker.string.numeric(6);
	return `${prefix} ${rest.slice(0, 3)}${rest.slice(3)}`;
};

// UK postcode generator
const ukPostcode = () => {
	const outward = faker.helpers.arrayElement([
		'CH1',
		'CH2',
		'CH3',
		'CH4',
		'CW1',
		'CW2',
		'LL11',
		'LL12',
		'WA1',
		'WA2',
		'SY1',
		'SY2',
	]);
	const inward = `${faker.string.numeric(1)}${faker.string.alpha({ length: 2, casing: 'upper' })}`;
	return `${outward} ${inward}`;
};

// UK counties/cities for the Chester area
const ukLocalities = [
	'Chester',
	'Wrexham',
	'Ellesmere Port',
	'Neston',
	'Mold',
	"Connah's Quay",
	'Flint',
	'Buckley',
	'Northwich',
	'Winsford',
];
const ukCounties = ['Cheshire', 'Flintshire', 'Wrexham', 'Denbighshire'];

// Generate UK address
function generateUkAddress(label?: string): typeof addresses.$inferInsert {
	const streetNumber = faker.location.buildingNumber();
	const route = faker.location.street();
	const locality = faker.helpers.arrayElement(ukLocalities);
	const county = faker.helpers.arrayElement(ukCounties);
	const postcode = ukPostcode();

	return {
		id: id(),
		streetNumber,
		route,
		locality,
		administrativeAreaLevel1: 'England',
		administrativeAreaLevel2: county,
		postalCode: postcode,
		country: 'GB',
		formattedAddress: `${streetNumber} ${route}, ${locality}, ${county} ${postcode}`,
		label,
		isPrimary: true,
	};
}

// Generate contact info
function generatePhone(type: 'phone' | 'mobile'): typeof contactInfo.$inferInsert {
	return {
		id: id(),
		type,
		value: type === 'mobile' ? ukMobile() : ukLandline(),
		isPrimary: type === 'phone',
	};
}

function generateEmail(name: string): typeof contactInfo.$inferInsert {
	const domain = faker.helpers.arrayElement([
		'gmail.com',
		'yahoo.co.uk',
		'hotmail.co.uk',
		'outlook.com',
		'btinternet.com',
	]);
	return {
		id: id(),
		type: 'email',
		value: `${name.toLowerCase().replace(/\s+/g, '.')}@${domain}`,
		isPrimary: true,
	};
}

// Store created records for relationships
const createdRecords: {
	tenantId: string;
	suppliers: string[];
	funeralDirectors: string[];
	councils: string[];
	memorialSites: string[];
	materialSections: string[];
	materials: string[];
	finishes: string[];
	letteringTechniques: string[];
	letteringColors: string[];
	letteringCosts: string[];
	sundries: string[];
	lineItemPresets: string[];
	productCategories: string[];
	products: string[];
	productOptions: Map<string, string[]>;
	productComponents: Map<string, string[]>;
	dimensionCombos: Map<string, string[]>;
	customers: string[];
	quotePackages: string[];
	quotes: string[];
	jobs: string[];
} = {
	tenantId: '',
	suppliers: [],
	funeralDirectors: [],
	councils: [],
	memorialSites: [],
	materialSections: [],
	materials: [],
	finishes: [],
	letteringTechniques: [],
	letteringColors: [],
	letteringCosts: [],
	sundries: [],
	lineItemPresets: [],
	productCategories: [],
	products: [],
	productOptions: new Map(),
	productComponents: new Map(),
	dimensionCombos: new Map(),
	customers: [],
	quotePackages: [],
	quotes: [],
	jobs: [],
};

// ============================================
// CLEAR DATA (if SEED_CLEAR=true)
// ============================================
async function clearTenantData(tenantId: string) {
	console.log('Clearing existing tenant data...');

	// Delete in reverse order of dependencies
	await db.delete(jobPaymentScheduleItems).where(eq(jobPaymentScheduleItems.tenantId, tenantId));
	await db.delete(jobs).where(eq(jobs.tenantId, tenantId));
	await db.delete(quoteLineItems);
	await db.delete(quoteSundries);
	await db.delete(quoteLettering);
	await db.delete(quoteComponents);
	await db.delete(quotes).where(eq(quotes.tenantId, tenantId));
	await db.delete(quotePackages).where(eq(quotePackages.tenantId, tenantId));

	// Customers and related
	const customerIds = await db
		.select({ id: customers.id })
		.from(customers)
		.where(eq(customers.tenantId, tenantId));
	for (const c of customerIds) {
		await db.delete(customerContactInfo).where(eq(customerContactInfo.customerId, c.id));
		await db.delete(customerAddresses).where(eq(customerAddresses.customerId, c.id));
	}
	await db.delete(customers).where(eq(customers.tenantId, tenantId));

	// Products and related
	await db.delete(dimensionComboValues);
	await db.delete(dimensionCombos).where(eq(dimensionCombos.productId, ''));
	await db.delete(productComponents);
	await db.delete(optionChoices);
	await db.delete(productOptions);
	const productIds = await db
		.select({ id: products.id })
		.from(products)
		.where(eq(products.tenantId, tenantId));
	for (const p of productIds) {
		await db.delete(dimensionCombos).where(eq(dimensionCombos.productId, p.id));
		await db.delete(productComponents).where(eq(productComponents.productId, p.id));
	}
	await db.delete(products).where(eq(products.tenantId, tenantId));
	await db.delete(productCategories).where(eq(productCategories.tenantId, tenantId));

	// Settings
	await db.delete(letteringCosts);
	await db.delete(letteringColors).where(eq(letteringColors.tenantId, tenantId));
	await db.delete(letteringTechniques).where(eq(letteringTechniques.tenantId, tenantId));
	await db.delete(sundries).where(eq(sundries.tenantId, tenantId));
	await db.delete(lineItemPresets).where(eq(lineItemPresets.tenantId, tenantId));
	await db.delete(materials).where(eq(materials.tenantId, tenantId));
	await db.delete(materialSections).where(eq(materialSections.tenantId, tenantId));
	await db.delete(finishes).where(eq(finishes.tenantId, tenantId));
	await db.delete(tenantPricingSettings).where(eq(tenantPricingSettings.tenantId, tenantId));

	// Partners
	const supplierIds = await db
		.select({ id: suppliers.id })
		.from(suppliers)
		.where(eq(suppliers.tenantId, tenantId));
	for (const s of supplierIds) {
		await db.delete(supplierContactInfo).where(eq(supplierContactInfo.supplierId, s.id));
		await db.delete(supplierAddresses).where(eq(supplierAddresses.supplierId, s.id));
	}
	await db.delete(suppliers).where(eq(suppliers.tenantId, tenantId));

	const fdIds = await db
		.select({ id: funeralDirectors.id })
		.from(funeralDirectors)
		.where(eq(funeralDirectors.tenantId, tenantId));
	for (const fd of fdIds) {
		await db
			.delete(funeralDirectorContactInfo)
			.where(eq(funeralDirectorContactInfo.funeralDirectorId, fd.id));
		await db
			.delete(funeralDirectorAddresses)
			.where(eq(funeralDirectorAddresses.funeralDirectorId, fd.id));
	}
	await db.delete(funeralDirectors).where(eq(funeralDirectors.tenantId, tenantId));

	const councilIds = await db
		.select({ id: councils.id })
		.from(councils)
		.where(eq(councils.tenantId, tenantId));
	for (const c of councilIds) {
		await db.delete(councilContactInfo).where(eq(councilContactInfo.councilId, c.id));
		await db.delete(councilAddresses).where(eq(councilAddresses.councilId, c.id));
	}
	await db.delete(councils).where(eq(councils.tenantId, tenantId));

	const siteIds = await db
		.select({ id: memorialSites.id })
		.from(memorialSites)
		.where(eq(memorialSites.tenantId, tenantId));
	for (const s of siteIds) {
		await db
			.delete(memorialSiteContactInfo)
			.where(eq(memorialSiteContactInfo.memorialSiteId, s.id));
		await db.delete(memorialSiteAddresses).where(eq(memorialSiteAddresses.memorialSiteId, s.id));
	}
	await db.delete(memorialSites).where(eq(memorialSites.tenantId, tenantId));

	console.log('Tenant data cleared.');
}

// ============================================
// LAYER 1: FOUNDATION
// ============================================
async function seedFoundation() {
	console.log('\n--- Layer 1: Foundation ---');

	// Check for existing demo tenant
	const existingTenant = await db.select().from(tenants).where(eq(tenants.slug, 'demo')).limit(1);

	if (existingTenant.length > 0) {
		createdRecords.tenantId = existingTenant[0].id;
		console.log(`Using existing demo tenant: ${existingTenant[0].name}`);

		if (process.env.SEED_CLEAR === 'true') {
			await clearTenantData(createdRecords.tenantId);
		}
	} else {
		// Create demo tenant
		const tenantId = id();
		await db.insert(tenants).values({
			id: tenantId,
			name: 'Griffiths Memorial Masons',
			slug: 'demo',
		});
		createdRecords.tenantId = tenantId;
		console.log('Created demo tenant');
	}

	// Check for existing pricing settings
	const existingSettings = await db
		.select()
		.from(tenantPricingSettings)
		.where(eq(tenantPricingSettings.tenantId, createdRecords.tenantId))
		.limit(1);

	if (existingSettings.length === 0) {
		await db.insert(tenantPricingSettings).values({
			id: id(),
			tenantId: createdRecords.tenantId,
			defaultMarkupPercent: '100',
			vatRate: '0.20',
			defaultDepositPercent: '50',
			quoteValidityDays: 30,
		});
		console.log('Created pricing settings');
	} else {
		console.log('Pricing settings already exist');
	}

	// Material sections
	const sectionNames = ['White', 'Black', 'Grey', 'Blue', 'Green', 'Red/Brown'];
	const existingSections = await db
		.select()
		.from(materialSections)
		.where(eq(materialSections.tenantId, createdRecords.tenantId));

	if (existingSections.length === 0) {
		for (let i = 0; i < sectionNames.length; i++) {
			const sectionId = id();
			await db.insert(materialSections).values({
				id: sectionId,
				tenantId: createdRecords.tenantId,
				name: sectionNames[i],
				sortOrder: i,
			});
			createdRecords.materialSections.push(sectionId);
		}
		console.log(`Created ${sectionNames.length} material sections`);
	} else {
		createdRecords.materialSections = existingSections.map((s) => s.id);
		console.log(`Using ${existingSections.length} existing material sections`);
	}

	// Product categories
	const categoryNames = [
		'Headstones',
		'Full Memorials',
		'Cremation Memorials',
		'Plaques',
		'Vases',
		'Restoration',
	];
	const existingCategories = await db
		.select()
		.from(productCategories)
		.where(eq(productCategories.tenantId, createdRecords.tenantId));

	if (existingCategories.length === 0) {
		for (let i = 0; i < categoryNames.length; i++) {
			const catId = id();
			await db.insert(productCategories).values({
				id: catId,
				tenantId: createdRecords.tenantId,
				name: categoryNames[i],
				sortOrder: i,
			});
			createdRecords.productCategories.push(catId);
		}
		console.log(`Created ${categoryNames.length} product categories`);
	} else {
		createdRecords.productCategories = existingCategories.map((c) => c.id);
		console.log(`Using ${existingCategories.length} existing product categories`);
	}

	// Create demo user
	await seedDemoUser();
}

// Demo user credentials
const DEMO_EMAIL = 'demo@griffiths-crm.local';
const DEMO_PASSWORD = 'demo1234';
const DEMO_NAME = 'Demo User';

async function seedDemoUser() {
	// Check if demo user already exists
	const existingUser = await db.select().from(users).where(eq(users.email, DEMO_EMAIL)).limit(1);

	if (existingUser.length > 0) {
		// Update tenant assignment if needed
		if (existingUser[0].tenantId !== createdRecords.tenantId) {
			await db
				.update(users)
				.set({ tenantId: createdRecords.tenantId })
				.where(eq(users.email, DEMO_EMAIL));
			console.log(`Updated demo user tenant assignment`);
		} else {
			console.log(`Demo user already exists: ${DEMO_EMAIL}`);
		}
		return;
	}

	// Create user via Better Auth API
	const result = await auth.api.createUser({
		body: {
			email: DEMO_EMAIL,
			password: DEMO_PASSWORD,
			name: DEMO_NAME,
			role: 'tenant_user',
		},
	});

	if (!result) {
		throw new Error('Failed to create demo user');
	}

	// Assign to demo tenant and mark as verified
	await db
		.update(users)
		.set({
			tenantId: createdRecords.tenantId,
			emailVerified: true,
		})
		.where(eq(users.email, DEMO_EMAIL));

	console.log(`Created demo user: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

// ============================================
// LAYER 2: PARTNERS
// ============================================
async function seedPartners() {
	console.log('\n--- Layer 2: Partners ---');

	const tenantId = createdRecords.tenantId;

	// Suppliers (10)
	const existingSuppliers = await db
		.select()
		.from(suppliers)
		.where(eq(suppliers.tenantId, tenantId));
	if (existingSuppliers.length === 0) {
		const supplierData = [
			{ name: 'Stone Supplies UK', trading: 'StoneUK' },
			{ name: 'Memorial Granite Ltd', trading: null },
			{ name: 'Welsh Slate Company', trading: 'Welsh Slate' },
			{ name: 'Yorkshire Stone Merchants', trading: null },
			{ name: 'Celtic Cross Memorials', trading: null },
			{ name: 'Northern Granite', trading: 'NorGran' },
			{ name: 'Premium Headstones Ltd', trading: null },
			{ name: 'Midlands Memorial Supplies', trading: 'MMS' },
			{ name: 'Coastal Granite', trading: null },
			{ name: 'Heritage Stone Works', trading: null },
		];

		for (const s of supplierData) {
			const supplierId = id();
			await db.insert(suppliers).values({
				id: supplierId,
				tenantId,
				businessName: s.name,
				tradingName: s.trading,
				accountNumber: `ACC${faker.string.numeric(6)}`,
				website: `https://www.${s.name.toLowerCase().replace(/\s+/g, '')}.co.uk`,
				paymentTerms: faker.helpers.arrayElement(['net_30', 'net_14', 'net_7']),
				defaultLeadTimeDays: faker.number.int({ min: 5, max: 21 }),
			});

			// Add address
			const addr = generateUkAddress('Main');
			await db.insert(addresses).values(addr);
			await db.insert(supplierAddresses).values({ supplierId, addressId: addr.id! });

			// Add contact info
			const phone = generatePhone('phone');
			const email = generateEmail(s.name);
			await db.insert(contactInfo).values([phone, email]);
			await db.insert(supplierContactInfo).values([
				{ supplierId, contactInfoId: phone.id! },
				{ supplierId, contactInfoId: email.id! },
			]);

			createdRecords.suppliers.push(supplierId);
		}
		console.log(`Created ${supplierData.length} suppliers`);
	} else {
		createdRecords.suppliers = existingSuppliers.map((s) => s.id);
		console.log(`Using ${existingSuppliers.length} existing suppliers`);
	}

	// Funeral Directors (12)
	const existingFDs = await db
		.select()
		.from(funeralDirectors)
		.where(eq(funeralDirectors.tenantId, tenantId));
	if (existingFDs.length === 0) {
		const fdData = [
			{ name: 'J.G. Hughes & Son', arrangement: 'commission', rate: '5.00' },
			{ name: 'Williams Funeral Services', arrangement: 'preferred_partner', rate: null },
			{ name: 'Thomas & Co Funeral Directors', arrangement: 'informal', rate: null },
			{ name: 'Evans Family Funerals', arrangement: 'commission', rate: '7.50' },
			{ name: 'Roberts & Davies', arrangement: 'none', rate: null },
			{ name: 'Dignity Funerals - Chester', arrangement: 'preferred_partner', rate: null },
			{ name: 'Co-op Funeralcare', arrangement: 'informal', rate: null },
			{ name: 'Percy Jones & Son', arrangement: 'commission', rate: '5.00' },
			{ name: 'Margaret Green Funeral Services', arrangement: 'none', rate: null },
			{ name: 'Powys Funeral Home', arrangement: 'informal', rate: null },
			{ name: 'Border Counties Funerals', arrangement: 'commission', rate: '6.00' },
			{ name: 'Dee Valley Funeral Services', arrangement: 'preferred_partner', rate: null },
		];

		for (const fd of fdData) {
			const fdId = id();
			await db.insert(funeralDirectors).values({
				id: fdId,
				tenantId,
				businessName: fd.name,
				website: `https://www.${fd.name.toLowerCase().replace(/[^a-z]/g, '')}.co.uk`,
			});

			const addr = generateUkAddress('Main');
			await db.insert(addresses).values(addr);
			await db
				.insert(funeralDirectorAddresses)
				.values({ funeralDirectorId: fdId, addressId: addr.id! });

			const phone = generatePhone('phone');
			const email = generateEmail(fd.name);
			await db.insert(contactInfo).values([phone, email]);
			await db.insert(funeralDirectorContactInfo).values([
				{ funeralDirectorId: fdId, contactInfoId: phone.id! },
				{ funeralDirectorId: fdId, contactInfoId: email.id! },
			]);

			createdRecords.funeralDirectors.push(fdId);
		}
		console.log(`Created ${fdData.length} funeral directors`);
	} else {
		createdRecords.funeralDirectors = existingFDs.map((fd) => fd.id);
		console.log(`Using ${existingFDs.length} existing funeral directors`);
	}

	// Councils (6)
	const existingCouncils = await db.select().from(councils).where(eq(councils.tenantId, tenantId));
	if (existingCouncils.length === 0) {
		const councilData = [
			{ name: 'Cheshire West and Chester Council', cemetery: 'Blacon Cemetery', fee: '85.00' },
			{ name: 'Flintshire County Council', cemetery: "Connah's Quay Cemetery", fee: '75.00' },
			{ name: 'Wrexham County Borough Council', cemetery: 'Wrexham Cemetery', fee: '80.00' },
			{ name: 'Denbighshire County Council', cemetery: 'Ruthin Cemetery', fee: '70.00' },
			{ name: 'Chester City Council', cemetery: 'Overleigh Cemetery', fee: '90.00' },
			{
				name: 'Ellesmere Port & Neston Council',
				cemetery: 'Ellesmere Port Cemetery',
				fee: '85.00',
			},
		];

		for (const c of councilData) {
			const councilId = id();
			await db.insert(councils).values({
				id: councilId,
				tenantId,
				councilName: c.name,
				cemeteryName: c.cemetery,
				department: 'Bereavement Services',
				permitRequired: true,
				permitFee: c.fee,
				maxHeadstoneHeight: '3ft 6in',
				maxHeadstoneWidth: '3ft',
			});

			const addr = generateUkAddress('Office');
			await db.insert(addresses).values(addr);
			await db.insert(councilAddresses).values({ councilId, addressId: addr.id! });

			const phone = generatePhone('phone');
			const email = generateEmail(c.name);
			await db.insert(contactInfo).values([phone, email]);
			await db.insert(councilContactInfo).values([
				{ councilId, contactInfoId: phone.id! },
				{ councilId, contactInfoId: email.id! },
			]);

			createdRecords.councils.push(councilId);
		}
		console.log(`Created ${councilData.length} councils`);
	} else {
		createdRecords.councils = existingCouncils.map((c) => c.id);
		console.log(`Using ${existingCouncils.length} existing councils`);
	}

	// Memorial Sites (18)
	const existingSites = await db
		.select()
		.from(memorialSites)
		.where(eq(memorialSites.tenantId, tenantId));
	if (existingSites.length === 0) {
		const siteData = [
			// Churchyards (8)
			{
				name: "St Mary's Church",
				type: 'churchyard',
				denom: 'church_of_england',
				diocese: 'Chester',
			},
			{
				name: 'Holy Trinity Church',
				type: 'churchyard',
				denom: 'church_of_england',
				diocese: 'Chester',
			},
			{
				name: "St John's Parish Church",
				type: 'churchyard',
				denom: 'church_of_england',
				diocese: 'Chester',
			},
			{
				name: 'All Saints Church',
				type: 'churchyard',
				denom: 'church_of_england',
				diocese: 'St Asaph',
			},
			{ name: "St Peter's Catholic Church", type: 'churchyard', denom: 'catholic', diocese: null },
			{ name: 'Bethel Methodist Chapel', type: 'churchyard', denom: 'methodist', diocese: null },
			{ name: 'Chester Baptist Church', type: 'churchyard', denom: 'baptist', diocese: null },
			{ name: 'Quaker Meeting House', type: 'churchyard', denom: 'quaker', diocese: null },
			// Crematoria (4)
			{ name: 'Blacon Crematorium', type: 'crematorium', operator: 'Cheshire West Council' },
			{ name: 'Flintshire Crematorium', type: 'crematorium', operator: 'Flintshire Council' },
			{ name: 'Wrexham Crematorium', type: 'crematorium', operator: 'Wrexham Council' },
			{ name: 'Northop Hall Crematorium', type: 'crematorium', operator: 'Dignity Funerals' },
			// Council Cemeteries (6)
			{ name: 'Blacon Cemetery', type: 'council_cemetery', council: 'Cheshire West and Chester' },
			{ name: 'Overleigh Cemetery', type: 'council_cemetery', council: 'Chester City Council' },
			{ name: "Connah's Quay Cemetery", type: 'council_cemetery', council: 'Flintshire County' },
			{ name: 'Wrexham Cemetery', type: 'council_cemetery', council: 'Wrexham Borough' },
			{ name: 'Mold Cemetery', type: 'council_cemetery', council: 'Flintshire County' },
			{ name: 'Buckley Cemetery', type: 'council_cemetery', council: 'Flintshire County' },
		];

		for (const s of siteData) {
			const siteId = id();
			await db.insert(memorialSites).values({
				id: siteId,
				tenantId,
				name: s.name,
				siteType: s.type,
				denomination: s.type === 'churchyard' ? (s as any).denom : null,
				diocese: s.type === 'churchyard' ? (s as any).diocese : null,
				facultyRequired: s.type === 'churchyard' && (s as any).denom === 'church_of_england',
				operatorName: s.type === 'crematorium' ? (s as any).operator : null,
				hasMemorialGarden: s.type === 'crematorium',
				plaquesOffered: s.type === 'crematorium',
				councilName: s.type === 'council_cemetery' ? (s as any).council : null,
				permitRequired: s.type === 'council_cemetery',
				permitFee: s.type === 'council_cemetery' ? '85.00' : null,
			});

			const addr = generateUkAddress();
			await db.insert(addresses).values(addr);
			await db
				.insert(memorialSiteAddresses)
				.values({ memorialSiteId: siteId, addressId: addr.id! });

			const phone = generatePhone('phone');
			await db.insert(contactInfo).values(phone);
			await db
				.insert(memorialSiteContactInfo)
				.values({ memorialSiteId: siteId, contactInfoId: phone.id! });

			createdRecords.memorialSites.push(siteId);
		}
		console.log(`Created ${siteData.length} memorial sites`);
	} else {
		createdRecords.memorialSites = existingSites.map((s) => s.id);
		console.log(`Using ${existingSites.length} existing memorial sites`);
	}
}

// ============================================
// LAYER 3: PRODUCT CATALOG
// ============================================
async function seedProductCatalog() {
	console.log('\n--- Layer 3: Product Catalog ---');

	const tenantId = createdRecords.tenantId;

	// Finishes (6)
	const existingFinishes = await db.select().from(finishes).where(eq(finishes.tenantId, tenantId));
	if (existingFinishes.length === 0) {
		const finishNames = [
			'Polished',
			'Honed',
			'Flamed',
			'Sandblasted',
			'Bush Hammered',
			'Natural Split',
		];
		for (let i = 0; i < finishNames.length; i++) {
			const finishId = id();
			await db.insert(finishes).values({
				id: finishId,
				tenantId,
				name: finishNames[i],
				sortOrder: i,
			});
			createdRecords.finishes.push(finishId);
		}
		console.log(`Created ${finishNames.length} finishes`);
	} else {
		createdRecords.finishes = existingFinishes.map((f) => f.id);
		console.log(`Using ${existingFinishes.length} existing finishes`);
	}

	// Materials (18 across 6 sections)
	const existingMaterials = await db
		.select()
		.from(materials)
		.where(eq(materials.tenantId, tenantId));
	if (existingMaterials.length === 0) {
		const materialData = [
			// White (section 0)
			{ name: 'Carrara White', cost: '180.00', section: 0 },
			{ name: 'Arctic White', cost: '220.00', section: 0 },
			{ name: 'Bianco Sardo', cost: '195.00', section: 0 },
			// Black (section 1)
			{ name: 'Nero Assoluto', cost: '250.00', section: 1 },
			{ name: 'Galaxy Black', cost: '280.00', section: 1 },
			{ name: 'Belfast Black', cost: '230.00', section: 1 },
			// Grey (section 2)
			{ name: 'Silver Grey', cost: '160.00', section: 2 },
			{ name: 'Karin Grey', cost: '175.00', section: 2 },
			{ name: 'Light Grey', cost: '145.00', section: 2 },
			// Blue (section 3)
			{ name: 'Blue Pearl', cost: '320.00', section: 3 },
			{ name: 'Labrador Blue', cost: '350.00', section: 3 },
			{ name: 'Bahama Blue', cost: '290.00', section: 3 },
			// Green (section 4)
			{ name: 'Emerald Pearl', cost: '340.00', section: 4 },
			{ name: 'Forest Green', cost: '260.00', section: 4 },
			{ name: 'Tropical Green', cost: '275.00', section: 4 },
			// Red/Brown (section 5)
			{ name: 'Ruby Red', cost: '310.00', section: 5 },
			{ name: 'Balmoral Red', cost: '285.00', section: 5 },
			{ name: 'Mahogany', cost: '270.00', section: 5 },
		];

		for (const m of materialData) {
			const materialId = id();
			await db.insert(materials).values({
				id: materialId,
				tenantId,
				sectionId: createdRecords.materialSections[m.section],
				supplierId: faker.helpers.arrayElement(createdRecords.suppliers),
				name: m.name,
			});
			createdRecords.materials.push(materialId);
		}
		console.log(`Created ${materialData.length} materials`);
	} else {
		createdRecords.materials = existingMaterials.map((m) => m.id);
		console.log(`Using ${existingMaterials.length} existing materials`);
	}

	// Lettering Techniques (5)
	const existingTechniques = await db
		.select()
		.from(letteringTechniques)
		.where(eq(letteringTechniques.tenantId, tenantId));
	if (existingTechniques.length === 0) {
		const techniqueNames = [
			'Sandblasted',
			'V-Cut',
			'Incised',
			'Re-cut Existing',
			'Applied Letters',
		];
		for (let i = 0; i < techniqueNames.length; i++) {
			const techId = id();
			await db.insert(letteringTechniques).values({
				id: techId,
				tenantId,
				name: techniqueNames[i],
				sortOrder: i,
			});
			createdRecords.letteringTechniques.push(techId);
		}
		console.log(`Created ${techniqueNames.length} lettering techniques`);
	} else {
		createdRecords.letteringTechniques = existingTechniques.map((t) => t.id);
		console.log(`Using ${existingTechniques.length} existing lettering techniques`);
	}

	// Lettering Colors (6)
	const existingColors = await db
		.select()
		.from(letteringColors)
		.where(eq(letteringColors.tenantId, tenantId));
	if (existingColors.length === 0) {
		const colorNames = [
			'Gold Leaf',
			'Silver',
			'White Paint',
			'Black Paint',
			'Bronze',
			'None (natural)',
		];
		for (let i = 0; i < colorNames.length; i++) {
			const colorId = id();
			await db.insert(letteringColors).values({
				id: colorId,
				tenantId,
				name: colorNames[i],
				sortOrder: i,
			});
			createdRecords.letteringColors.push(colorId);
		}
		console.log(`Created ${colorNames.length} lettering colors`);
	} else {
		createdRecords.letteringColors = existingColors.map((c) => c.id);
		console.log(`Using ${existingColors.length} existing lettering colors`);
	}

	// Lettering Costs (pricing matrix)
	const existingCosts = await db.select().from(letteringCosts).limit(1);
	if (existingCosts.length === 0) {
		// Base prices per technique (no color = default)
		const basePrices: Record<number, string> = {
			0: '2.50', // Sandblasted
			1: '3.00', // V-Cut
			2: '2.75', // Incised
			3: '1.50', // Re-cut
			4: '4.00', // Applied
		};

		// Color premiums
		const colorPremiums: Record<number, string> = {
			0: '1.00', // Gold Leaf
			1: '0.50', // Silver
			2: '0.25', // White Paint
			3: '0.25', // Black Paint
			4: '0.75', // Bronze
			5: '0.00', // None
		};

		for (let t = 0; t < createdRecords.letteringTechniques.length; t++) {
			// Default price (no color)
			const defaultCostId = id();
			await db.insert(letteringCosts).values({
				id: defaultCostId,
				techniqueId: createdRecords.letteringTechniques[t],
				colorId: null,
				appliesTo: 'both',
				freeLetters: t === 0 ? 75 : 0, // 75 free letters for sandblasted only
				pricePerLetter: basePrices[t],
			});
			createdRecords.letteringCosts.push(defaultCostId);

			// Color-specific prices
			for (let c = 0; c < createdRecords.letteringColors.length; c++) {
				const costId = id();
				const basePrice = parseFloat(basePrices[t]);
				const premium = parseFloat(colorPremiums[c]);
				await db.insert(letteringCosts).values({
					id: costId,
					techniqueId: createdRecords.letteringTechniques[t],
					colorId: createdRecords.letteringColors[c],
					appliesTo: 'both',
					freeLetters: t === 0 ? 75 : 0,
					pricePerLetter: (basePrice + premium).toFixed(2),
				});
				createdRecords.letteringCosts.push(costId);
			}
		}
		console.log(`Created ${createdRecords.letteringCosts.length} lettering cost entries`);
	} else {
		console.log('Lettering costs already exist');
	}

	// Sundries (12)
	const existingSundries = await db.select().from(sundries).where(eq(sundries.tenantId, tenantId));
	if (existingSundries.length === 0) {
		const sundryData = [
			{ name: 'Ceramic Photo Plaque - Small', price: '45.00' },
			{ name: 'Ceramic Photo Plaque - Large', price: '75.00' },
			{ name: 'Bronze Photo Plaque', price: '120.00' },
			{ name: 'Ceramic Flower', price: '18.00' },
			{ name: 'Silk Flower Arrangement', price: '25.00' },
			{ name: 'Memorial Lantern', price: '35.00' },
			{ name: 'Solar Light', price: '28.00' },
			{ name: 'Bronze Vase Insert', price: '55.00' },
			{ name: 'Granite Flower Vase', price: '85.00' },
			{ name: 'Memorial Book', price: '95.00' },
			{ name: 'Dove Ornament', price: '40.00' },
			{ name: 'Angel Figurine', price: '65.00' },
		];

		for (let i = 0; i < sundryData.length; i++) {
			const sundryId = id();
			await db.insert(sundries).values({
				id: sundryId,
				tenantId,
				supplierId: faker.helpers.arrayElement(createdRecords.suppliers),
				name: sundryData[i].name,
				price: sundryData[i].price,
				sortOrder: i,
			});
			createdRecords.sundries.push(sundryId);
		}
		console.log(`Created ${sundryData.length} sundries`);
	} else {
		createdRecords.sundries = existingSundries.map((s) => s.id);
		console.log(`Using ${existingSundries.length} existing sundries`);
	}

	// Line Item Presets (8)
	const existingPresets = await db
		.select()
		.from(lineItemPresets)
		.where(eq(lineItemPresets.tenantId, tenantId));
	if (existingPresets.length === 0) {
		const presetData = [
			{ name: 'Delivery', price: '75.00', vatExempt: false },
			{ name: 'Installation', price: '250.00', vatExempt: false },
			{ name: 'Church Faculty Fee', price: '150.00', vatExempt: true },
			{ name: 'Council Permit', price: '85.00', vatExempt: true },
			{ name: 'Foundation Work', price: '180.00', vatExempt: false },
			{ name: 'Removal of Existing', price: '120.00', vatExempt: false },
			{ name: 'Cleaning & Restoration', price: '95.00', vatExempt: false },
			{ name: 'Rush Order Surcharge', price: '150.00', vatExempt: false },
		];

		for (let i = 0; i < presetData.length; i++) {
			const presetId = id();
			await db.insert(lineItemPresets).values({
				id: presetId,
				tenantId,
				name: presetData[i].name,
				defaultPrice: presetData[i].price,
				vatExempt: presetData[i].vatExempt,
				sortOrder: i,
			});
			createdRecords.lineItemPresets.push(presetId);
		}
		console.log(`Created ${presetData.length} line item presets`);
	} else {
		createdRecords.lineItemPresets = existingPresets.map((p) => p.id);
		console.log(`Using ${existingPresets.length} existing line item presets`);
	}

	// Products (12)
	const existingProducts = await db.select().from(products).where(eq(products.tenantId, tenantId));
	if (existingProducts.length === 0) {
		const productData = [
			{
				sku: 'HS-001',
				name: 'Classic Lawn Memorial',
				category: 0,
				price: '895.00',
				desc: 'Traditional headstone with base',
			},
			{
				sku: 'HS-002',
				name: 'Ogee Top Headstone',
				category: 0,
				price: '995.00',
				desc: 'Elegant curved top design',
			},
			{
				sku: 'HS-003',
				name: 'Heart Shaped Memorial',
				category: 0,
				price: '1195.00',
				desc: 'Romantic heart design',
			},
			{
				sku: 'FM-001',
				name: 'Full Kerb Set',
				category: 1,
				price: '2495.00',
				desc: 'Complete memorial with kerbs',
			},
			{
				sku: 'FM-002',
				name: 'Double Memorial',
				category: 1,
				price: '2995.00',
				desc: 'Memorial for two',
			},
			{
				sku: 'FM-003',
				name: 'Celtic Cross Memorial',
				category: 1,
				price: '3495.00',
				desc: 'Traditional Celtic design',
			},
			{
				sku: 'CM-001',
				name: 'Cremation Tablet',
				category: 2,
				price: '495.00',
				desc: 'Small memorial tablet',
			},
			{
				sku: 'CM-002',
				name: 'Book Memorial',
				category: 2,
				price: '695.00',
				desc: 'Open book design',
			},
			{
				sku: 'CM-003',
				name: 'Cremation Desk',
				category: 2,
				price: '795.00',
				desc: 'Desk-style memorial',
			},
			{
				sku: 'PL-001',
				name: 'Bronze Wall Plaque',
				category: 3,
				price: '295.00',
				desc: 'Cast bronze plaque',
			},
			{
				sku: 'VS-001',
				name: 'Granite Vase',
				category: 4,
				price: '145.00',
				desc: 'Polished granite vase',
			},
			{
				sku: 'RS-001',
				name: 'Memorial Restoration',
				category: 5,
				price: '350.00',
				desc: 'Cleaning and regilding',
			},
		];

		for (const p of productData) {
			const productId = id();
			await db.insert(products).values({
				id: productId,
				tenantId,
				categoryId: createdRecords.productCategories[p.category],
				supplierId: faker.helpers.arrayElement(createdRecords.suppliers),
				sku: p.sku,
				name: p.name,
				description: p.desc,
			});
			createdRecords.products.push(productId);

			// Product options based on category
			const optionIds: string[] = [];
			createdRecords.productOptions.set(productId, optionIds);

			// Stone color option (for all stone products)
			if (p.category !== 5) {
				// Not restoration
				const colorOptId = id();
				await db.insert(productOptions).values({
					id: colorOptId,
					productId,
					name: 'Stone Color',
					type: 'stone_color',
					isRequired: true,
					sortOrder: 0,
				});
				optionIds.push(colorOptId);

				// Add stone color choices (subset of materials)
				const stoneColors = createdRecords.materials.slice(0, 6);
				for (let i = 0; i < stoneColors.length; i++) {
					await db.insert(optionChoices).values({
						id: id(),
						optionId: colorOptId,
						name: faker.helpers.arrayElement([
							'Nero Assoluto',
							'Silver Grey',
							'Blue Pearl',
							'Ruby Red',
							'Carrara White',
							'Emerald Pearl',
						]),
						priceAdjustment: faker.helpers.arrayElement(['0', '50.00', '100.00', '150.00']),
						sortOrder: i,
					});
				}
			}

			// Flower holes option (for headstones)
			if (p.category === 0 || p.category === 1) {
				const flowerOptId = id();
				await db.insert(productOptions).values({
					id: flowerOptId,
					productId,
					name: 'Flower Holes',
					type: 'flower_holes',
					isRequired: false,
					sortOrder: 1,
				});
				optionIds.push(flowerOptId);

				const flowerChoices = ['None Required', 'Left', 'Center', 'Right', 'Left & Right'];
				for (let i = 0; i < flowerChoices.length; i++) {
					await db.insert(optionChoices).values({
						id: id(),
						optionId: flowerOptId,
						name: flowerChoices[i],
						priceAdjustment: i === 0 ? '0' : '25.00',
						sortOrder: i,
					});
				}
			}

			// Product components
			const componentIds: string[] = [];
			createdRecords.productComponents.set(productId, componentIds);

			if (p.category === 0) {
				// Headstones: headstone + base
				const hsCompId = id();
				const baseCompId = id();
				await db.insert(productComponents).values([
					{ id: hsCompId, productId, componentType: 'headstone', sortOrder: 0 },
					{ id: baseCompId, productId, componentType: 'base', sortOrder: 1 },
				]);
				componentIds.push(hsCompId, baseCompId);
			} else if (p.category === 1) {
				// Full memorials: headstone + base + kerbs
				const hsCompId = id();
				const baseCompId = id();
				const kerbCompId = id();
				await db.insert(productComponents).values([
					{ id: hsCompId, productId, componentType: 'headstone', sortOrder: 0 },
					{ id: baseCompId, productId, componentType: 'base', sortOrder: 1 },
					{ id: kerbCompId, productId, componentType: 'kerb', sortOrder: 2 },
				]);
				componentIds.push(hsCompId, baseCompId, kerbCompId);
			} else if (p.category === 2) {
				// Cremation: tablet or book
				const tabletCompId = id();
				await db.insert(productComponents).values({
					id: tabletCompId,
					productId,
					componentType: p.sku === 'CM-002' ? 'book' : 'tablet',
					sortOrder: 0,
				});
				componentIds.push(tabletCompId);
			} else if (p.category === 3) {
				// Plaques
				const plaqueCompId = id();
				await db.insert(productComponents).values({
					id: plaqueCompId,
					productId,
					componentType: 'plaque',
					sortOrder: 0,
				});
				componentIds.push(plaqueCompId);
			} else if (p.category === 4) {
				// Vases
				const vaseCompId = id();
				await db.insert(productComponents).values({
					id: vaseCompId,
					productId,
					componentType: 'vase',
					sortOrder: 0,
				});
				componentIds.push(vaseCompId);
			}

			// Dimension combos (3 sizes for most products)
			const comboIds: string[] = [];
			createdRecords.dimensionCombos.set(productId, comboIds);

			if (componentIds.length > 0 && p.category !== 5) {
				const sizes = [
					{ name: 'Small', adjust: '-100.00' },
					{ name: 'Medium', adjust: '0' },
					{ name: 'Large', adjust: '150.00' },
				];

				for (let s = 0; s < sizes.length; s++) {
					const comboId = id();
					await db.insert(dimensionCombos).values({
						id: comboId,
						productId,
						name: sizes[s].name,
						priceAdjustment: sizes[s].adjust,
						sortOrder: s,
					});
					comboIds.push(comboId);

					// Add dimension values for each component
					for (const compId of componentIds) {
						const baseDim = 18 + s * 6; // 18, 24, 30
						await db.insert(dimensionComboValues).values({
							id: id(),
							comboId,
							productComponentId: compId,
							dimension1: String(baseDim),
							dimension2: String(baseDim - 6),
							dimension3: String(3 + s),
						});
					}
				}
			}
		}
		console.log(`Created ${productData.length} products with options and components`);
	} else {
		createdRecords.products = existingProducts.map((p) => p.id);
		console.log(`Using ${existingProducts.length} existing products`);
	}
}

// ============================================
// LAYER 4: CUSTOMERS
// ============================================
async function seedCustomers() {
	console.log('\n--- Layer 4: Customers ---');

	const tenantId = createdRecords.tenantId;
	const existingCustomers = await db
		.select()
		.from(customers)
		.where(eq(customers.tenantId, tenantId));

	if (existingCustomers.length === 0) {
		for (let i = 0; i < 75; i++) {
			const firstName = faker.person.firstName();
			const lastName = faker.person.lastName();
			const customerId = id();

			await db.insert(customers).values({
				id: customerId,
				tenantId,
				firstName,
				lastName,
			});

			// Add address
			const addr = generateUkAddress('Home');
			await db.insert(addresses).values(addr);
			await db.insert(customerAddresses).values({ customerId, addressId: addr.id! });

			// Add contact info (phone, mobile, email)
			const phone = generatePhone('phone');
			const mobile = generatePhone('mobile');
			const email = generateEmail(`${firstName} ${lastName}`);
			await db.insert(contactInfo).values([phone, mobile, email]);
			await db.insert(customerContactInfo).values([
				{ customerId, contactInfoId: phone.id! },
				{ customerId, contactInfoId: mobile.id! },
				{ customerId, contactInfoId: email.id! },
			]);

			createdRecords.customers.push(customerId);
		}
		console.log('Created 75 customers');
	} else {
		createdRecords.customers = existingCustomers.map((c) => c.id);
		console.log(`Using ${existingCustomers.length} existing customers`);
	}
}

// ============================================
// LAYER 5: QUOTES
// ============================================
async function seedQuotes() {
	console.log('\n--- Layer 5: Quotes ---');

	const tenantId = createdRecords.tenantId;
	const existingQuotes = await db.select().from(quotes).where(eq(quotes.tenantId, tenantId));

	if (existingQuotes.length === 0) {
		// Status distribution: 8 draft, 5 ready, 8 presented, 12 accepted, 5 rejected, 2 expired
		const statusDistribution = [
			...Array(8).fill('draft'),
			...Array(5).fill('ready'),
			...Array(8).fill('presented'),
			...Array(12).fill('accepted'),
			...Array(5).fill('rejected'),
			...Array(2).fill('expired'),
		];

		const quoteTypes = [
			'new_memorial',
			'additional_inscription',
			'refurbishment',
			'ashes',
			'sundry_only',
		];
		const sources = ['walk_in', 'phone', 'email', 'website', 'facebook', 'referral'];

		let quoteNumber = 1;
		let packageNumber = 1;

		for (let i = 0; i < 40; i++) {
			const status = statusDistribution[i];
			const quoteType = faker.helpers.arrayElement(quoteTypes);
			const customerId = faker.helpers.arrayElement(createdRecords.customers);
			const productId = faker.helpers.arrayElement(createdRecords.products);

			// Create quote package
			const pkgId = id();
			await db.insert(quotePackages).values({
				id: pkgId,
				tenantId,
				packageNumber: `P-${String(packageNumber++).padStart(5, '0')}`,
				customerId,
				quoteType,
				source: faker.helpers.arrayElement(sources),
				funeralDirectorId: faker.datatype.boolean(0.4)
					? faker.helpers.arrayElement(createdRecords.funeralDirectors)
					: null,
				memorialSiteId: faker.datatype.boolean(0.6)
					? faker.helpers.arrayElement(createdRecords.memorialSites)
					: null,
				status,
				validUntil: faker.date.future({ years: 0.1 }),
			});
			createdRecords.quotePackages.push(pkgId);

			// Create quote
			const quoteId = id();
			const vatRate = 0.2;

			// Calculate pricing
			let subtotal = 0;
			let totalCost = 0;

			// Base product price
			const basePrice = parseFloat(
				faker.helpers.arrayElement(['895.00', '995.00', '1495.00', '1995.00', '2495.00']),
			);
			subtotal += basePrice;
			totalCost += basePrice * 0.5; // Assume 50% cost

			await db.insert(quotes).values({
				id: quoteId,
				tenantId,
				packageId: pkgId,
				optionLabel: 'Option A',
				optionOrder: 0,
				version: 1,
				customerId,
				productId,
				funeralDirectorId: faker.datatype.boolean(0.4)
					? faker.helpers.arrayElement(createdRecords.funeralDirectors)
					: null,
				memorialSiteId: faker.datatype.boolean(0.6)
					? faker.helpers.arrayElement(createdRecords.memorialSites)
					: null,
				quoteNumber: `Q-${String(quoteNumber++).padStart(5, '0')}`,
				quoteType,
				status,
				source: faker.helpers.arrayElement(sources),
				subtotal: subtotal.toFixed(2),
				vatAmount: (subtotal * vatRate).toFixed(2),
				total: (subtotal * (1 + vatRate)).toFixed(2),
				totalCost: totalCost.toFixed(2),
				vatRate: vatRate.toFixed(4),
				proposedInscription: generateInscription(),
				validUntil: faker.date.future({ years: 0.1 }),
			});
			createdRecords.quotes.push(quoteId);

			// Quote components
			const componentTypes = ['headstone', 'base'];
			for (let c = 0; c < componentTypes.length; c++) {
				const materialId = faker.helpers.arrayElement(createdRecords.materials);
				const finishId = faker.helpers.arrayElement(createdRecords.finishes);
				const supplierCost = parseFloat(
					faker.helpers.arrayElement(['180.00', '220.00', '250.00', '280.00']),
				);
				const markupPercent = 100;
				const unitPrice = supplierCost * (1 + markupPercent / 100);

				await db.insert(quoteComponents).values({
					id: id(),
					quoteId,
					componentType: componentTypes[c],
					materialId,
					finishId,
					height: faker.helpers.arrayElement(['24', '30', '36']),
					width: faker.helpers.arrayElement(['18', '24', '30']),
					depth: faker.helpers.arrayElement(['3', '4', '6']),
					quantity: 1,
					supplierCost: supplierCost.toFixed(2),
					markupPercent: markupPercent.toFixed(2),
					unitPrice: unitPrice.toFixed(2),
					lineTotal: unitPrice.toFixed(2),
					materialName: faker.helpers.arrayElement(['Nero Assoluto', 'Silver Grey', 'Blue Pearl']),
					finishName: faker.helpers.arrayElement(['Polished', 'Honed']),
					sortOrder: c,
				});
			}

			// Quote lettering
			const techniqueId = faker.helpers.arrayElement(createdRecords.letteringTechniques);
			const colorId = faker.helpers.arrayElement(createdRecords.letteringColors);
			const letterCount = faker.number.int({ min: 50, max: 150 });
			const pricePerLetter = parseFloat(faker.helpers.arrayElement(['2.50', '3.00', '3.50']));

			await db.insert(quoteLettering).values({
				id: id(),
				quoteId,
				techniqueId,
				colorId,
				text: generateInscription(),
				letterCount,
				appliesTo: 'both',
				supplierCost: (pricePerLetter * 0.5).toFixed(2),
				markupPercent: '100',
				unitPrice: pricePerLetter.toFixed(2),
				lineTotal: (pricePerLetter * letterCount).toFixed(2),
				techniqueName: faker.helpers.arrayElement(['Sandblasted', 'V-Cut', 'Incised']),
				colorName: faker.helpers.arrayElement(['Gold Leaf', 'Silver', 'White Paint']),
				sortOrder: 0,
			});

			// Quote sundries (50% chance)
			if (faker.datatype.boolean(0.5)) {
				const sundryId = faker.helpers.arrayElement(createdRecords.sundries);
				const sundryPrice = parseFloat(faker.helpers.arrayElement(['45.00', '75.00', '95.00']));

				await db.insert(quoteSundries).values({
					id: id(),
					quoteId,
					sundryId,
					quantity: 1,
					supplierCost: (sundryPrice * 0.4).toFixed(2),
					markupPercent: '150',
					unitPrice: sundryPrice.toFixed(2),
					lineTotal: sundryPrice.toFixed(2),
					sundryName: faker.helpers.arrayElement([
						'Ceramic Photo Plaque',
						'Memorial Lantern',
						'Dove Ornament',
					]),
					sortOrder: 0,
				});
			}

			// Quote line items
			await db.insert(quoteLineItems).values({
				id: id(),
				quoteId,
				description: 'Delivery & Installation',
				price: '325.00',
				vatExempt: false,
				visibleToCustomer: true,
				sortOrder: 0,
			});

			// 30% chance of permit fee
			if (faker.datatype.boolean(0.3)) {
				await db.insert(quoteLineItems).values({
					id: id(),
					quoteId,
					description: 'Council Permit Fee',
					price: '85.00',
					vatExempt: true,
					visibleToCustomer: true,
					sortOrder: 1,
				});
			}
		}
		console.log('Created 40 quotes with packages');
	} else {
		createdRecords.quotes = existingQuotes.map((q) => q.id);
		console.log(`Using ${existingQuotes.length} existing quotes`);
	}
}

// Helper to generate inscription text
function generateInscription(): string {
	const templates = [
		`In Loving Memory of\n${faker.person.fullName()}\n${faker.date.birthdate({ min: 1930, max: 1980, mode: 'year' }).getFullYear()} - ${faker.number.int({ min: 2020, max: 2024 })}\nForever in our hearts`,
		`${faker.person.fullName()}\nBeloved ${faker.helpers.arrayElement(['Mother', 'Father', 'Husband', 'Wife'])}\nRest in Peace`,
		`In Memory of\n${faker.person.fullName()}\nGone but never forgotten\nAlways loved`,
		`Treasured Memories of\n${faker.person.fullName()}\n${faker.date.birthdate({ min: 1940, max: 1990, mode: 'year' }).getFullYear()} - ${faker.number.int({ min: 2020, max: 2024 })}\nUntil we meet again`,
	];
	return faker.helpers.arrayElement(templates);
}

// ============================================
// LAYER 6: JOBS
// ============================================
async function seedJobs() {
	console.log('\n--- Layer 6: Jobs ---');

	const tenantId = createdRecords.tenantId;
	const existingJobs = await db.select().from(jobs).where(eq(jobs.tenantId, tenantId));

	if (existingJobs.length === 0) {
		// Get accepted quotes
		const acceptedQuotes = await db
			.select()
			.from(quotes)
			.where(and(eq(quotes.tenantId, tenantId), eq(quotes.status, 'accepted')))
			.limit(15);

		// Status distribution: 3 pending, 3 materials_ordered, 4 in_production, 3 ready_for_install, 2 installed
		const statusDistribution = [
			...Array(3).fill('pending'),
			...Array(3).fill('materials_ordered'),
			...Array(4).fill('in_production'),
			...Array(3).fill('ready_for_install'),
			...Array(2).fill('installed'),
		];

		let jobNumber = 1;

		for (let i = 0; i < Math.min(15, acceptedQuotes.length); i++) {
			const quote = acceptedQuotes[i];
			const status = statusDistribution[i] || 'pending';
			const jobId = id();

			await db.insert(jobs).values({
				id: jobId,
				tenantId,
				quoteId: quote.id,
				jobNumber: `J-${String(jobNumber++).padStart(5, '0')}`,
				status,
				installationDate:
					status === 'installed'
						? faker.date.recent({ days: 30 })
						: faker.date.future({ years: 0.25 }),
				deadline: faker.date.future({ years: 0.5 }),
			});
			createdRecords.jobs.push(jobId);

			// Payment schedule (deposit + balance)
			const total = parseFloat(quote.total);
			const depositAmount = total * 0.5;
			const balanceAmount = total - depositAmount;

			// Deposit
			await db.insert(jobPaymentScheduleItems).values({
				id: id(),
				tenantId,
				jobId,
				description: 'Deposit (50%)',
				amount: depositAmount.toFixed(2),
				dueDate: faker.date.recent({ days: 14 }),
				paidAmount: status !== 'pending' ? depositAmount.toFixed(2) : '0',
				paidAt: status !== 'pending' ? faker.date.recent({ days: 14 }) : null,
				paymentMethod: status !== 'pending' ? 'bank_transfer' : null,
				sortOrder: 0,
			});

			// Balance
			await db.insert(jobPaymentScheduleItems).values({
				id: id(),
				tenantId,
				jobId,
				description: 'Balance',
				amount: balanceAmount.toFixed(2),
				dueDate: faker.date.future({ years: 0.25 }),
				paidAmount:
					status === 'installed' || status === 'completed' ? balanceAmount.toFixed(2) : '0',
				paidAt:
					status === 'installed' || status === 'completed' ? faker.date.recent({ days: 7 }) : null,
				paymentMethod: status === 'installed' || status === 'completed' ? 'card' : null,
				sortOrder: 1,
			});
		}
		console.log(`Created ${createdRecords.jobs.length} jobs with payment schedules`);
	} else {
		createdRecords.jobs = existingJobs.map((j) => j.id);
		console.log(`Using ${existingJobs.length} existing jobs`);
	}
}

// ============================================
// MAIN
// ============================================
async function main() {
	console.log('='.repeat(50));
	console.log('Griffiths CRM - Database Seed Script');
	console.log('='.repeat(50));
	console.log(`Mode: ${process.env.SEED_CLEAR === 'true' ? 'CLEAR & REGENERATE' : 'ADDITIVE'}`);

	try {
		await seedFoundation();
		await seedPartners();
		await seedProductCatalog();
		await seedCustomers();
		await seedQuotes();
		await seedJobs();

		console.log(`\n${'='.repeat(50)}`);
		console.log('Seeding complete!');
		console.log('='.repeat(50));
		console.log('\nSummary:');
		console.log(`  Tenant: demo`);
		console.log(`  Customers: ${createdRecords.customers.length}`);
		console.log(`  Suppliers: ${createdRecords.suppliers.length}`);
		console.log(`  Funeral Directors: ${createdRecords.funeralDirectors.length}`);
		console.log(`  Memorial Sites: ${createdRecords.memorialSites.length}`);
		console.log(`  Products: ${createdRecords.products.length}`);
		console.log(`  Materials: ${createdRecords.materials.length}`);
		console.log(`  Quotes: ${createdRecords.quotes.length}`);
		console.log(`  Jobs: ${createdRecords.jobs.length}`);

		process.exit(0);
	} catch (error) {
		console.error('Seeding failed:', error);
		process.exit(1);
	}
}

main();
