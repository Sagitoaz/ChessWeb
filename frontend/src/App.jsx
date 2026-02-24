// ============================================================
// FULL APP (comment tạm để xem giao diện LoginPage)
// ============================================================
// import { BrowserRouter as Router } from 'react-router-dom'
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// import { Toaster } from 'react-hot-toast'
// import { NotificationProvider } from '@/components/common'
// import AppRoutes from './routes'
//
// const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       retry: 1,
//       refetchOnWindowFocus: false,
//     },
//   },
// })
//
// function App() {
//   return (
//     <QueryClientProvider client={queryClient}>
//       <NotificationProvider position="top-right">
//         <Router>
//           <div className="min-h-screen bg-gray-50">
//             <AppRoutes />
//             <Toaster
//               position="top-right"
//               toastOptions={{
//                 duration: 3000,
//                 style: { background: '#363636', color: '#fff' },
//                 success: { duration: 3000, iconTheme: { primary: '#22c55e', secondary: '#fff' } },
//                 error:   { duration: 4000, iconTheme: { primary: '#ef4444', secondary: '#fff' } },
//               }}
//             />
//           </div>
//         </Router>
//       </NotificationProvider>
//     </QueryClientProvider>
//   )
// }
// ============================================================

import { BrowserRouter as Router } from 'react-router-dom'
import { NotificationProvider } from '@/components/common'
import LoginPage from '@/pages/auth/LoginPage'

function App() {
  return (
    <NotificationProvider position="top-right">
      <Router>
        <LoginPage />
      </Router>
    </NotificationProvider>
  )
}

export default App