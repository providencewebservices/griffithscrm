import { BrowserRouter, Routes, Route } from 'react-router';
import { Toaster } from 'sonner';
import { LoginPage } from './pages/login';
import { ResetPasswordPage } from './pages/reset-password';
import { AdminLayout } from './layouts/admin-layout';
import { CustomerLayout } from './layouts/customer-layout';
import { AdminDashboard } from './pages/admin/dashboard';
import { TenantsPage } from './pages/admin/tenants';
import { UsersPage } from './pages/admin/users';
import { CustomerDashboard } from './pages/customer';
import { TeamPage } from './pages/customer/team';
import { TeamMemberDetailPage } from './pages/customer/team-member-detail';
import { ContactsPage } from './pages/customer/contacts';
import { CustomerDetailPage } from './pages/customer/customer-detail';
import { ProductsPage } from './pages/customer/products';
import { ProductDetailPage } from './pages/customer/product-detail';
import { CategoryDetailPage } from './pages/customer/category-detail';
import { LetteringTechniqueDetailPage } from './pages/customer/lettering-technique-detail';
import { MaterialSectionDetailPage } from './pages/customer/material-section-detail';
import { MaterialDetailPage } from './pages/customer/material-detail';
import { SundryDetailPage } from './pages/customer/sundry-detail';
import { SettingsPage } from './pages/customer/settings';
import { QuotesPage } from './pages/customer/quotes';
import { QuoteDetailPage } from './pages/customer/quote-detail';
import { QuoteNewPage } from './pages/customer/quote-new';
import { JobsPage } from './pages/customer/jobs';
import { JobDetailPage } from './pages/customer/job-detail';
import { FuneralDirectorDetailPage } from './pages/customer/funeral-director-detail';
import { FuneralDirectorFormPage } from './pages/customer/funeral-director-form';
import { MemorialSiteDetailPage } from './pages/customer/memorial-site-detail';
import { MemorialSiteFormPage } from './pages/customer/memorial-site-form';
import { SuppliersPage } from './pages/customer/suppliers';
import { SupplierDetailPage } from './pages/customer/supplier-detail';
import { SupplierFormPage } from './pages/customer/supplier-form';
import { SupplierCollectionDetailPage } from './pages/customer/supplier-collection-detail';
import { SupplierProductDetailPage } from './pages/customer/supplier-product-detail';
import { DocumentsPage } from './pages/customer/documents';
import { DocumentViewerPage } from './pages/customer/document-viewer';
import { CalendarPage } from './pages/customer/calendar';
import { TasksPage } from './pages/customer/tasks';
import { TaskDetailPage } from './pages/customer/task-detail';
import { WorksheetDetailPage } from './pages/customer/worksheet-detail';
import { MemorialWorksheetPrintPage } from './pages/customer/memorial-worksheet-print';
import { InboxLayout } from './layouts/inbox-layout';
import { PublicPackageViewPage } from './pages/public/package-view';
import { PaymentPage } from './pages/public/payment';
import { PaymentSuccessPage } from './pages/public/payment-success';
import { PaymentFailurePage } from './pages/public/payment-failure';
import { ProtectedRoute } from './components/protected-route';
import { RoleBasedRedirect } from './components/role-based-redirect';

function App() {
	return (
		<BrowserRouter>
			<Toaster position="top-right" richColors />
			<Routes>
				<Route path="/login" element={<LoginPage />} />
				<Route path="/reset-password" element={<ResetPasswordPage />} />

				{/* Public routes (no auth required) */}
				<Route path="/quote/:token" element={<PublicPackageViewPage />} />
				<Route path="/pay/:token" element={<PaymentPage />} />
				<Route path="/payment/success" element={<PaymentSuccessPage />} />
				<Route path="/payment/failure" element={<PaymentFailurePage />} />

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
					<Route path="jobs" element={<JobsPage />} />
					<Route path="jobs/:id" element={<JobDetailPage />} />
					<Route path="jobs/:id/worksheet/print" element={<MemorialWorksheetPrintPage />} />
					<Route path="team" element={<TeamPage />} />
					<Route path="team/:id" element={<TeamMemberDetailPage />} />
					<Route path="products" element={<ProductsPage />} />
					<Route path="products/:id" element={<ProductDetailPage />} />
					<Route path="contacts" element={<ContactsPage />} />
					<Route path="customers/:id" element={<CustomerDetailPage />} />
					<Route path="settings" element={<SettingsPage />} />
					<Route path="categories/:id" element={<CategoryDetailPage />} />
					<Route path="lettering-techniques/:id" element={<LetteringTechniqueDetailPage />} />
					<Route path="material-sections/:id" element={<MaterialSectionDetailPage />} />
					<Route path="materials/:id" element={<MaterialDetailPage />} />
					<Route path="sundries/:id" element={<SundryDetailPage />} />
					<Route path="funeral-directors/new" element={<FuneralDirectorFormPage />} />
					<Route path="funeral-directors/:id" element={<FuneralDirectorDetailPage />} />
					<Route path="funeral-directors/:id/edit" element={<FuneralDirectorFormPage />} />
					<Route path="memorial-sites/new" element={<MemorialSiteFormPage />} />
					<Route path="memorial-sites/:id" element={<MemorialSiteDetailPage />} />
					<Route path="memorial-sites/:id/edit" element={<MemorialSiteFormPage />} />
					<Route path="suppliers" element={<SuppliersPage />} />
					<Route path="suppliers/new" element={<SupplierFormPage />} />
					<Route path="suppliers/:id" element={<SupplierDetailPage />} />
					<Route path="suppliers/:id/edit" element={<SupplierFormPage />} />
					<Route path="suppliers/:supplierId/collections/:collectionId" element={<SupplierCollectionDetailPage />} />
					<Route path="suppliers/:supplierId/collections/:collectionId/products/:productId" element={<SupplierProductDetailPage />} />
					<Route path="tasks" element={<TasksPage />} />
					<Route path="tasks/:id" element={<TaskDetailPage />} />
					<Route path="tasks/worksheets/:id" element={<WorksheetDetailPage />} />
					<Route path="documents" element={<DocumentsPage />} />
					<Route path="documents/:id" element={<DocumentViewerPage />} />
					<Route path="calendar" element={<CalendarPage />} />
				</Route>

				{/* Inbox — dedicated sidebar-09 layout */}
				<Route
					path="/app/inbox"
					element={
						<ProtectedRoute requiredRole="tenant_user">
							<InboxLayout />
						</ProtectedRoute>
					}
				/>
			</Routes>
		</BrowserRouter>
	);
}

export default App;
