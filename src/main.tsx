import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { useAuthStore } from '@/store/auth'
import { useThemeStore } from '@/store/theme'
import { getErrorMessage } from '@/lib/api'
import { actionToast } from '@/store/actionToast'

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      if (mutation.meta?.suppressErrorToast) return
      actionToast.error(
        (mutation.meta?.errorTitle as string | undefined) ?? 'Something went wrong',
        getErrorMessage(error)
      )
    },
    onSuccess: (_data, _vars, _ctx, mutation) => {
      const successMessage = mutation.meta?.successMessage as string | undefined
      if (successMessage) {
        actionToast.success(successMessage, mutation.meta?.successDescription as string | undefined)
      }
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

function Root() {
  // Hydrate auth from localStorage on initial render
  useAuthStore.getState().hydrate()
  useThemeStore.getState().init()

  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
