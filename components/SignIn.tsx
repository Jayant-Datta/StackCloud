import React from 'react'
import Logo from '../public/Stack.svg'
import Image from 'next/image'
import email from '../public/mail.png'


const SignIn = () => {
  return (
    <div className='flex h-screen w-screen'>
    
      <div className='flex flex-col justify-center items-center h-full w-1/2 bg-pink-500 px-6'>

        <Image src={Logo} alt='Logo' className='w-32 h-32'/>
         
        <div className='text-black text-2xl font-semibold'>
            StackCloud
        </div>
          
      </div>
    
      <div className='h-full w-1/2 bg-white flex flex-col justify-center items-center'>

        <div className='text-black text-3xl font-semibold'>Welcome Back</div>
        <div className='text-gray-500 '> Welcome back,Please Enter your details</div>

        <div className='flex justify-between gap-16 mt-2'>
           <button className='text-black border-black border-2 p-2 rounded-xl'>Sign In</button>
           <button className='text-black border-black border-2 p-2 rounded-xl'>Sign Up</button>
        </div>
        
        <div className='rounded-2xl border-2 border-gray-200 flex items-center mt-3 p-4 gap-2'>
          <Image src={email} alt='Email' className='w-5 h-5'/>
          <div className='w-1 border-3 border-gray-200 h-6 '> </div>
          <input
          placeholder='Enter Your Email'
          type='email'
          className='w-full text-black placeholder-gray-400 outline-none bg-transparent' 
            />
        </div>

        <button className='mt-6 p-4 bg-pink-500   w-60 rounded-2xl'>Continue</button>

      </div>
    
    </div>
  )
}

export default SignIn