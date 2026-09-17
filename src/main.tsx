import React from 'react'
import ReactDOM from 'react-dom/client'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { queryClient, persister, dehydrateOptions } from '@/lib/queryClient'
import UpdatePrompt from '@/components/layout/UpdatePrompt'
import { Toaster } from '@/components/ui/Toast'
import App from './App'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/public-sans'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersistQueryClientProvider client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 * 7, dehydrateOptions }}>
      <App />
      {/* Outside the router so the toast survives navigation. */}
      <UpdatePrompt />
      <Toaster />
    </PersistQueryClientProvider>
  </React.StrictMode>
)
