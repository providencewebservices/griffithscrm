import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { LoginPage } from './pages/login';
import { DashboardPage } from './pages/dashboard';
import { ProtectedRoute } from './components/protected-route';

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/login" element={<LoginPage />} />
				<Route
					path="/dashboard"
					element={
						<ProtectedRoute>
							<DashboardPage />
						</ProtectedRoute>
					}
				/>
				<Route path="/" element={<Navigate to="/dashboard" replace />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;
