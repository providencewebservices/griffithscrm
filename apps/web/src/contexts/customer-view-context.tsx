import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { useNavigate, useLocation } from "react-router"

interface CustomerViewContextValue {
	isCustomerView: boolean
	toggleCustomerView: () => void
}

const CustomerViewContext = createContext<CustomerViewContextValue | null>(null)

const ALLOWED_PREFIXES = ["/app/quotes", "/app/products", "/app/sundries"]

export function CustomerViewProvider({ children }: { children: ReactNode }) {
	const [isCustomerView, setIsCustomerView] = useState(false)
	const navigate = useNavigate()
	const location = useLocation()

	const toggleCustomerView = useCallback(() => {
		setIsCustomerView((prev) => {
			const entering = !prev
			if (entering) {
				const isAllowed = ALLOWED_PREFIXES.some((prefix) =>
					location.pathname.startsWith(prefix)
				)
				if (!isAllowed) {
					navigate("/app/products")
				}
			}
			return entering
		})
	}, [location.pathname, navigate])

	return (
		<CustomerViewContext.Provider value={{ isCustomerView, toggleCustomerView }}>
			{children}
		</CustomerViewContext.Provider>
	)
}

export function useCustomerView() {
	const context = useContext(CustomerViewContext)
	if (!context) {
		throw new Error("useCustomerView must be used within a CustomerViewProvider")
	}
	return context
}
