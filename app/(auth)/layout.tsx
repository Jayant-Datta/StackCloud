import { Layers } from 'lucide-react'
import { Metadata } from 'next'
import React from 'react'
import Cloud from '../../public/cloud-server.png'
import Image from 'next/image'

export const metadata : Metadata={
    title: "Login",
    description : "Login to StackCloud"
}

const Layout = ({children}: { children: React.ReactNode}) => {
  return (
    <div className='h-screen flex'>
        <section className='bg-froly flex-1 p-2'>
          <div className='flex items-start justify-center flex-col  max-w-125 mx-auto h-full'>
            <div className='flex items-center justify-center gap-3'>
                <Layers className='w-10 h-10 text-white' />
                <span className='text-white font-medium text-3xl'>StackCloud</span>
            </div>

            <div className='flex items-start gap-4 flex-col mt-8'>
               <span className='font-bold text-[20px] text-white'>A Better Way to Store, Organize, and Access Your Files  </span>
               <span   className='text-white'>Securely Upload, Manage, and Access from any device, anytime </span>
            </div>
            <div >
                <Image src={Cloud} alt='Cloud' className='w-100 h-100 mt-6  '/>
            </div>
            

          </div>
        </section>

        
        <section className='bg-white flex-1 flex items-center justify-center '>{children}</section>

        
    </div>
  )
}

export default Layout