import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import React, { useState } from 'react'
import { Dialog ,DialogContent } from './ui/dialog';
import { Mail } from 'lucide-react';
import ButtonLoading from "./ButtonLoading";
import { VerifySecret } from "@/lib/appwrite/user.action";
import { useRouter } from "next/navigation";

// 1. ADDED onClose to the props
const OTPModel = ({accountId, email, onClose}: { accountId: string; email: string; onClose: () => void }) => {
    const [showOTPModel, setshowOTPModel] = useState(true);
    const [Loading, setLoading] = useState(false);
    const [password, setpassword] = useState("");
    const router = useRouter()

    const handleVerifyEmail = async () => {
        setLoading(true);
        try {
              const session = await VerifySecret({accountId, password})
              if(session){
                  router.push("/");
              }
             setLoading(false); 
        }catch(error){
            console.log("Failed to verify otp",error);
            setLoading(false);
        }
    };
     
    // 2. ADDED this function to handle the dialog closing
    const handleOpenChange = (isOpen: boolean) => {
        setshowOTPModel(isOpen);
        if (!isOpen) {
            onClose(); // This tells the parent to clear the accountId
        }
    };

    return (
    // 3. UPDATED onOpenChange to use our new handler
    <Dialog open={showOTPModel} onOpenChange={handleOpenChange}>
        <DialogContent className='w-[450px] rounded-xl' >
            <div className='flex flex-col items-center justify-center' >
                <div className='bg-froly/10 rounded-full w-16 h-16 flex items-center justify-center ' >
                 <Mail className='w-8 h-8 text-froly' />
                </div>
                <span className='text-2xl font-medium mt-4' >Check Your Email</span>
                <span className='text-center text-gray-600 font-light px-4' >Enter the verification code sent to {""} <strong className='font-medium text-black break-all' >{email}</strong> </span>
                <InputOTP maxLength={6} value={password}  onChange={setpassword} >
                    <div className="flex items-center gap-2 mt-2">
                        <InputOTPSlot index={0} className="border-froly border-2 !rounded-xl w-12 h-12" />
                        <InputOTPSlot index={1} className="border-froly border-2 rounded-xl w-12 h-12" />
                        <InputOTPSlot index={2} className="border-froly border-2 rounded-xl w-12 h-12" />
                        
                        <InputOTPSeparator className="text-gray-400" />
                        
                        <InputOTPSlot index={3} className="border-froly border-2 rounded-xl w-12 h-12" />
                        <InputOTPSlot index={4} className="border-froly border-2 rounded-xl w-12 h-12" />
                        <InputOTPSlot index={5} className="border-froly border-2 !rounded-xl w-12 h-12" />
                    </div>
                </InputOTP>

                <span className="mt-4 text-gray-600" >Didn&apos;t get a code ?<strong className="text-black underline cursor-pointer" >resend</strong></span>
                
                {/* 4. FIXED your button loading logic here! */}
                <ButtonLoading loading={Loading} onClick={handleVerifyEmail} /> 
            </div>
        </DialogContent>
    </Dialog>
  )
}

export default OTPModel