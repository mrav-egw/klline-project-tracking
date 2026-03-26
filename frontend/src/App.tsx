import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { ProjektePage } from './pages/ProjektePage'
import { ProjektDetailPage } from './pages/ProjektDetailPage'
import { KundenPage } from './pages/KundenPage'
import { VertriebsberichtPage } from './pages/VertriebsberichtPage'
import { LieferantenPage } from './pages/LieferantenPage'
import { MonturePage } from './pages/MonturePage'
import { BenutzerPage } from './pages/BenutzerPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/projekte" replace />} />
            <Route path="projekte" element={<ProjektePage />} />
            <Route path="projekte/:id" element={<ProjektDetailPage />} />
            <Route path="kunden" element={<KundenPage />} />
            <Route path="vertriebsbericht" element={<VertriebsberichtPage />} />
            <Route path="lieferanten" element={<LieferantenPage />} />
            <Route path="monteure" element={<MonturePage />} />
            <Route path="benutzer" element={<BenutzerPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
