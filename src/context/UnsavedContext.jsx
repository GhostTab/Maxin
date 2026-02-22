import { createContext, useContext, useState } from 'react'

const UnsavedContext = createContext(null)

export function UnsavedProvider({ children }) {
  const [hasUnsavedChanges, setUnsavedChanges] = useState(false)
  return (
    <UnsavedContext.Provider value={{ hasUnsavedChanges, setUnsavedChanges }}>
      {children}
    </UnsavedContext.Provider>
  )
}

export function useUnsaved() {
  const ctx = useContext(UnsavedContext)
  if (!ctx) return { hasUnsavedChanges: false, setUnsavedChanges: () => {} }
  return ctx
}
