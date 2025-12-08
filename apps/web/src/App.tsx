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
					<Route path="team" element={<TeamPage />} />
					<Route path="customers" element={<CustomersPage />} />
				</Route>
			</Routes>
		</BrowserRouter>
	);
}

export default App;
