import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTenantSettingsQuery } from '@/hooks/use-tenant-settings';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ENDPOINTS = [
	{
		path: '/categories',
		description: 'List all product categories for the tenant.',
		params: null,
		example: `{
  "categories": [
    {
      "id": "cat_abc123",
      "name": "Headstones",
      "description": "Traditional upright headstones",
      "imageUrl": "https://example.com/headstones.jpg",
      "sortOrder": 1
    }
  ]
}`,
	},
	{
		path: '/products',
		description: 'List active products with pagination. Optionally filter by category.',
		params: [
			{ name: 'page', type: 'number', default: '1', description: 'Page number' },
			{ name: 'limit', type: 'number', default: '20', description: 'Items per page (max 100)' },
			{ name: 'categoryId', type: 'string', default: '—', description: 'Filter by category ID' },
		],
		example: `{
  "products": [
    {
      "id": "prod_abc123",
      "sku": "HS-001",
      "name": "Classic Headstone",
      "description": "A traditional upright headstone",
      "imageUrl": "https://example.com/classic.jpg",
      "category": { "id": "cat_abc123", "name": "Headstones" }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}`,
	},
	{
		path: '/products/:productId',
		description:
			'Get full product detail including options, choices, components, and dimension combinations.',
		params: null,
		example: `{
  "product": {
    "id": "prod_abc123",
    "sku": "HS-001",
    "name": "Classic Headstone",
    "description": "A traditional upright headstone",
    "imageUrl": "https://example.com/classic.jpg",
    "category": { "id": "cat_abc123", "name": "Headstones" },
    "options": [
      {
        "id": "opt_1",
        "name": "Shape",
        "type": "single_select",
        "isRequired": true,
        "sortOrder": 1,
        "choices": [
          {
            "id": "ch_1",
            "name": "Ogee",
            "priceAdjustment": "50.00",
            "imageUrl": null,
            "sortOrder": 1
          }
        ]
      }
    ],
    "components": [
      {
        "id": "comp_1",
        "componentType": "headstone",
        "name": "Main Headstone",
        "quantity": 1,
        "sortOrder": 1
      }
    ],
    "dimensionCombos": [
      {
        "id": "dc_1",
        "name": "Standard Size",
        "priceAdjustment": "0.00",
        "sortOrder": 1,
        "values": [
          {
            "componentId": "comp_1",
            "componentType": "headstone",
            "componentName": "Main Headstone",
            "dimension1": "24",
            "dimension2": "18",
            "dimension3": "3"
          }
        ]
      }
    ]
  }
}`,
	},
	{
		path: '/materials',
		description: 'List material sections with their active materials. Empty sections are excluded.',
		params: null,
		example: `{
  "sections": [
    {
      "id": "sec_abc123",
      "name": "Granite",
      "sortOrder": 1,
      "materials": [
        {
          "id": "mat_1",
          "name": "Black Granite",
          "imageUrl": "https://example.com/black-granite.jpg",
          "sortOrder": 1
        }
      ]
    }
  ]
}`,
	},
	{
		path: '/finishes',
		description: 'List active finishes for the tenant.',
		params: null,
		example: `{
  "finishes": [
    {
      "id": "fin_abc123",
      "name": "Polished",
      "sortOrder": 1
    }
  ]
}`,
	},
];

export function ApiTab() {
	const { data: settings, isLoading, error } = useTenantSettingsQuery();

	if (isLoading) {
		return <div className="text-muted-foreground">Loading settings...</div>;
	}

	if (error) {
		return <div className="text-destructive">Error loading settings: {error.message}</div>;
	}

	const baseUrl = `${API_URL}/api/external/${settings?.slug}`;

	const handleCopy = () => {
		navigator.clipboard.writeText(baseUrl);
		toast.success('Copied to clipboard');
	};

	return (
		<div className="space-y-8">
			{/* Base URL */}
			<Card>
				<CardHeader>
					<CardTitle>Base URL</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground mb-3">
						All endpoints are relative to this base URL. No authentication is required.
					</p>
					<div className="flex items-center gap-2">
						<code className="flex-1 bg-muted px-4 py-2.5 rounded-md text-sm font-mono break-all">
							{baseUrl}
						</code>
						<Button variant="outline" size="sm" onClick={handleCopy}>
							<Copy className="h-4 w-4 mr-1.5" />
							Copy
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Endpoint reference */}
			{ENDPOINTS.map((endpoint) => (
				<Card key={endpoint.path}>
					<CardHeader>
						<div className="flex items-center gap-3">
							<Badge variant="secondary">GET</Badge>
							<CardTitle className="text-base font-mono">{endpoint.path}</CardTitle>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-sm text-muted-foreground">{endpoint.description}</p>

						{endpoint.params && (
							<div>
								<h4 className="text-sm font-medium mb-2">Query Parameters</h4>
								<div className="border rounded-md overflow-hidden">
									<table className="w-full text-sm">
										<thead>
											<tr className="bg-muted/50">
												<th className="text-left px-3 py-2 font-medium">Parameter</th>
												<th className="text-left px-3 py-2 font-medium">Type</th>
												<th className="text-left px-3 py-2 font-medium">Default</th>
												<th className="text-left px-3 py-2 font-medium">Description</th>
											</tr>
										</thead>
										<tbody>
											{endpoint.params.map((param) => (
												<tr key={param.name} className="border-t">
													<td className="px-3 py-2 font-mono text-xs">{param.name}</td>
													<td className="px-3 py-2 text-muted-foreground">{param.type}</td>
													<td className="px-3 py-2 text-muted-foreground">{param.default}</td>
													<td className="px-3 py-2 text-muted-foreground">{param.description}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						)}

						<div>
							<h4 className="text-sm font-medium mb-2">Example Response</h4>
							<pre className="bg-muted rounded-md p-4 overflow-x-auto">
								<code className="text-sm">{endpoint.example}</code>
							</pre>
						</div>
					</CardContent>
				</Card>
			))}

			{/* Usage notes */}
			<Card>
				<CardHeader>
					<CardTitle>Usage Notes</CardTitle>
				</CardHeader>
				<CardContent>
					<ul className="space-y-3 text-sm text-muted-foreground">
						<li>
							<span className="font-medium text-foreground">Caching:</span> All responses include a{' '}
							<code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs">
								Cache-Control: public, max-age=300
							</code>{' '}
							header (5 minute TTL).
						</li>
						<li>
							<span className="font-medium text-foreground">CORS:</span> Requests are allowed from
							any origin. No preflight restrictions apply.
						</li>
						<li>
							<span className="font-medium text-foreground">Authentication:</span> No authentication
							is required. All endpoints are publicly accessible.
						</li>
					</ul>
				</CardContent>
			</Card>
		</div>
	);
}
