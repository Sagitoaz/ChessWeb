import { useState } from 'react'
import PropTypes from 'prop-types'
import Header from './Header'
import Sidebar from './Sidebar'
import Footer from './Footer'
import { useUIStore } from '@/store'

/**
 * MainLayout - Wrapper layout chính cho các trang cần auth
 *
 * Cấu trúc:
 *   ┌──────────── Header ─────────────┐
 *   │ Sidebar │      Main Content     │
 *   ├─────────┤                       │
 *   │  (nav)  │   {children}          │
 *   └─────────┴───────────────────────┘
 *   │           Footer                │
 *   └─────────────────────────────────┘
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Nội dung trang
 * @param {boolean} props.hideSidebar - Ẩn sidebar (dùng cho trang game fullscreen)
 * @param {boolean} props.hideFooter - Ẩn footer
 */
const MainLayout = ({ children, hideSidebar = false, hideFooter = false }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { sidebarOpen, toggleSidebar } = useUIStore()

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header cố định trên cùng */}
      <Header />

      {/* Body: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {!hideSidebar && (
          <>
            {/* Desktop Sidebar — ẩn trên mobile */}
            <div className="hidden md:flex flex-col relative h-full">
              <Sidebar collapsed={sidebarCollapsed} />
              {/* Toggle collapse button */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="absolute -right-3 top-6 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-lg transition-colors z-10"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? '›' : '‹'}
              </button>
            </div>

            {/* Mobile Sidebar — drawer từ trái */}
            {sidebarOpen && (
              <>
                {/* Overlay */}
                <div
                  className="fixed inset-0 bg-black/40 z-40 md:hidden"
                  onClick={toggleSidebar}
                />
                {/* Drawer */}
                <div className="fixed top-0 left-0 h-full z-50 md:hidden flex flex-col">
                  <Sidebar collapsed={false} />
                </div>
              </>
            )}
          </>
        )}

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto">
          <div className="min-h-full p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>

      {/* Footer */}
      {!hideFooter && <Footer />}
    </div>
  )
}

MainLayout.propTypes = {
  children: PropTypes.node.isRequired,
}

export default MainLayout
