import { Metadata } from 'next'
import React from 'react'
import LuminaSidebar from '@/components/LuminaSidebar' // Make sure the path matches where you saved it!

export const metadata: Metadata = {
    title: "Login | Lumina",
    description: "Access your Lumina workspace"
}

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className='h-screen flex font-sans'>
        
        {/* Left Panel: Animated Client Component */}
        <LuminaSidebar />

        {/* Right Panel: Auth Form */}
        <section className='bg-white flex-1 flex items-center justify-center relative'>
           {/* Dotted grid background */}
           <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none"></div>
           
           <div className="relative z-10 w-full max-w-md px-4">
             {children}
           </div>
        </section>
        
    </div>
  )
}

export default Layout