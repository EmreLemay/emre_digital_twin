'use client'

import MenuBar from '../components/MenuBar'
import UIDemo from '../components/ui/demo/UIDemo'

export default function UIDemoPage() {
  return (
    <>
      <MenuBar />
      <main className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto">
          <div className="pt-8 pb-4">
            <h1 className="text-3xl font-bold mb-2">UI Component Library</h1>
            <p className="text-gray-400">
              Interactive showcase of reusable UI components for the Digital Twin Platform
            </p>
          </div>
          <UIDemo />
        </div>
      </main>
    </>
  )
}