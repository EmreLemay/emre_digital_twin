'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const MenuBar = () => {
  const pathname = usePathname()

  const menuItems = [
    { name: 'Home', href: '/', icon: '🏠' },
    { name: 'Assets', href: '/assets', icon: '📦' },
    { name: 'Multi Viewer', href: '/multi-viewer', icon: '🔍' },
    { name: 'Hierarchy', href: '/hierarchy', icon: '🌳' },
    { name: 'Data', href: '/data', icon: '📊' },
    { name: 'Mother Viewer', href: '/mother-viewer', icon: '👁️' },
  ]

  return (
    <nav className="bg-black/90 backdrop-blur-md border-b border-gray-800/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <div className="text-white font-semibold text-sm tracking-tight">
              Connex Digital Twin
            </div>
          </div>

          {/* Menu Items */}
          <div className="flex items-center space-x-8">
            {menuItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/' && pathname.startsWith(item.href))
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-white bg-gray-800/60'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800/40'
                  }`}
                >
                  <span className="text-xs">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* Right side info */}
          <div className="text-gray-400 text-xs font-medium">
            v0.4
          </div>
        </div>
      </div>
    </nav>
  )
}

export default MenuBar