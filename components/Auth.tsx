"use client";
import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import CustomInput from './CustomInput';
import { Mail, UserRoundPen } from 'lucide-react';
import ButtonLoading from './ButtonLoading';
import { isValid } from '@/lib/utils';
import { createAccount, signInUser } from '@/lib/appwrite/user.action';
import { Console } from 'node:console';
import OTPModel from './OTPModel';


const Auth = () => {
  
   const [TabValue, setTabValue] = useState('signIn');
   const [Value, setValue] = useState('');
   const [formData, setformData] = useState({
    fullName:"",
    Email:""
   });
   const [loading, setloading] = useState(false)
   const [ErrorMessage, setErrorMessage] = useState("")
   const [accountId,setAccountId] = useState("")
  
   const HandletabValueChange = (value:string)=>{
    setTabValue(value);
   };

   const HandleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
   };

   const HandleForm = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name , value} =e.target;

      setformData( (prev)=>{
        return{
          ...prev,
          [name ] : value,
        };
      } )
   };

   const Handleloading = () => {
    setloading(true);

    setTimeout(()=>{
      setloading(false);
    },2000);
   }

   const handleContinueClick = async () => {
    const { fullName } = formData;
    
    // 1. Dynamically get the correct email based on the active tab
    const activeEmail = TabValue === 'signIn' ? Value : formData.Email;

    // 2. Validate Full Name (Added the missing 'return;')
    if(!fullName && TabValue === 'signUp'){
      setErrorMessage("Full Name is Required");
      return; 
    }

    // 3. Validate the correct email
    if(!isValid(activeEmail)){
      setErrorMessage("Invalid Email");
      return;
    }

    try {
      setloading(true);
      // 4. Pass the activeEmail to the backend function
      // (Added a fallback "" for fullName just in case you are on the signIn tab)
      const user =
      TabValue=== 'signIn' ? 
      await signInUser(Value) :  
      await createAccount({ fullName: fullName || "", email: activeEmail });
      
      if(user.accountId){
        setAccountId(user.accountId);
      }

      setErrorMessage(user.message);
    } catch(error){
      setErrorMessage("SignIn Failed. Please try again in sometime");
      console.log("SignIn failed", error);
    } finally {
      setloading(false);
    }
   };

   console.log("print:", {accountId, ErrorMessage});
    
  return (
    <div >
       
          <div className='flex flex-col items-center mb-2 '>
           <span className='font-bold text-3xl text-black w-fit mb-2'>Welcome Back</span>
           <span className=' text-[#887d7d] w-fit'>Welcome Back, Please Enter Your Details</span>
          </div>
        <Tabs defaultValue={TabValue} className="w-[400px] flex items-center" onValueChange={HandletabValueChange}>
           <TabsList className='bg-[#f57799] rounded-[4px] '>
               <TabsTrigger value="signIn" className='rounded-[4px] cursor-pointer'>SignIn</TabsTrigger>
               <TabsTrigger value="signUp" className='rounded-[4px] cursor-pointer'>SignUp</TabsTrigger>
          </TabsList>
               <TabsContent value="signIn"  >
                 <div className='flex flex-col gap-4 mt-6' >
                  <CustomInput Icon={Mail} labelTitle='Email Address' labelHtmlFor='EmailAddress' value={Value} onChange={(e)=>{HandleChange(e)}} inputName='EmailAddress' />
                 </div>
               </TabsContent>

               <TabsContent value="signUp" className='flex flex-col gap-4 mt-6'>
                <CustomInput Icon={UserRoundPen} labelTitle='Full Name' labelHtmlFor='fullName' value={formData.fullName} onChange={ (e)=> { HandleForm(e)}} inputName='fullName'  />
                 <CustomInput Icon={Mail} labelTitle='Email Address' labelHtmlFor='EmailAddress' value={formData.Email} onChange={(e)=>{HandleForm(e)}} inputName='Email' />
               </TabsContent>
        </Tabs>
        <ButtonLoading loading={loading} onClick={handleContinueClick}/>
        
        {ErrorMessage ? <span className='bg-froly/10 font-medium py-4 px-8 text-[#f57799] block w-fit mx-auto' >*{ErrorMessage}</span> : null }
         
         {accountId ? <OTPModel  accountId={accountId} email={TabValue==='signIn' ? Value : formData.Email} onClose={() => setAccountId("")} /> : null}

    </div>
  );
};

export default Auth