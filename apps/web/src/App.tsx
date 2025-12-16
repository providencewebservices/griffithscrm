import { BrowserRouter, Routes, Route } from 'react-router';
import { LoginPage } from './pages/login';
import { ResetPasswordPage } from './pages/reset-password';
import { AdminLayout } from './layouts/admin-layout';
import { CustomerLayout } from './layouts/customer-layout';
import { AdminDashboard } from './pages/admin/dashboard';
import { TenantsPage } from './pages/admin/tenants';
import { UsersPage } from './pages/admin/users';
import { CustomerDashboard } from './pages/customer';
import { TeamPage } from './pages/customer/team';
import { CustomersPage } from './pages/customer/customers';
import { CustomerDetailPage } from './pages/customer/customer-detail';
import { ProductsPage } from './pages/customer/products';
import { ProductDetailPage } from './pages/customer/product-detail';
import { CategoryDetailPage } from './pages/customer/category-detail';
import { LetteringTechniqueDetailPage } from './pages/customer/lettering-technique-detail';
import { MaterialSectionDetailPage } from './pages/customer/material-section-detail';
import { MaterialDetailPage } from './pages/customer/material-detail';
import { SettingsPage } from './pages/customer/settings';
import { QuotesPage } from './pages/customer/quotes';
import { QuoteDetailPage } from './pages/customer/quote-detail';
import { QuoteNewPage } from './pages/customer/quote-new';
import { ProtectedRoute } from './components/protected-route';
import { RoleBasedRedirect } from './components/role-based-redirect';

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/login" element={<LoginPage />} />
				<Route path="/reset-password" element={<ResetPasswordPage />} />

				{/* Role-based redirect from root */}
				<Route path="/" element={<RoleBasedRedirect />} />

				{/* Admin routes */}
				<Route
					path="/admin"
					element={
						<ProtectedRoute requiredRole="app_admin">
							<AdminLayout />
						</ProtectedRoute>
					}
				>
					<Route index element={<AdminDashboard />} />
					<Route path="tenants" element={<TenantsPage />} />
					<Route path="users" element={<UsersPage />} />
				</Route>

				{/* Tenant user routes */}
				<Route
					path="/app"
					element={
						<ProtectedRoute requiredRole="tenant_user">
							<CustomerLayout />
						</ProtectedRoute>
					}
				>
					<Route index element={<CustomerDashboard />} />
					<Route path="quotes" element={<QuotesPage />} />
					<Route path="quotes/new" element={<QuoteNewPage />} />
					<Route path="quotes/:id" element={<QuoteDetailPage />} />
					<Route path="team" element={<TeamPage />} />
					<Route path="products" element={<ProductsPage />} />
					<Route path="products/:id" element={<ProductDetailPage />} />
					<Route path="customers" element={<CustomersPage />} />
					<Route path="customers/:id" element={<CustomerDetailPage />} />
					<Route path="settings" element={<SettingsPage />} />
					<Route path="categories/:id" element={<CategoryDetailPage />} />
					<Route path="lettering-techniques/:id" element={<LetteringTechniqueDetailPage />} />
					<Route path="material-sections/:id" element={<MaterialSectionDetailPage />} />
					<Route path="materials/:id" element={<MaterialDetailPage />} />
				</Route>
			</Routes>
		</BrowserRouter>
	);
}

export default App;
