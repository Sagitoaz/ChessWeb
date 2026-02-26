import { useState } from 'react'
import PropTypes from 'prop-types'
import Header from './Header'
import Sidebar from './Sidebar'
import Footer from './Footer'

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

  return (
    <div className="flex flex-col min-h-screen bg-gray-950">
      {/* Header cố định trên cùng */}
      <Header />

      {/* Body: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - ẩn trên mobile, hiện trên desktop */}
        {!hideSidebar && (
          <>
            {/* Desktop Sidebar */}
            <div className="hidden md:flex flex-col relative">
              <Sidebar collapsed={sidebarCollapsed} />

              {/* Toggle collapse button */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="absolute -right-3 top-6 bg-gray-700 hover:bg-gray-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-lg transition-colors z-10"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? '›' : '‹'}
              </button>
            </div>
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
