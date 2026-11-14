"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CustomInput from "@/components/CustomInput";
import { Mail, UserRoundPen, ArrowRight, Loader2 } from "lucide-react";
import { isValid } from "@/lib/utils";

const DemoAuth = ({ onEnter }: { onEnter: () => void }) => {
  const [tabValue, setTabValue] = useState("signIn");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleTabValueChange = (value: string) => {
    setTabValue(value);
    setErrorMessage("");
  };

  const handleContinueClick = () => {
    if (!fullName && tabValue === "signUp") {
      setErrorMessage("Full Name is required");
      return;
    }

    if (!isValid(email)) {
      setErrorMessage("Please enter a valid email address");
      return;
    }

    setErrorMessage("");
    setLoading(true);
    // Simulated network delay — this is a frontend-only demo, nothing is sent anywhere.
    setTimeout(() => {
      setLoading(false);
      onEnter();
    }, 700);
  };

  return (
    <div className="w-full max-w-[400px] mx-auto flex flex-col justify-center min-h-[500px]">
      <div className="flex flex-col mb-8 text-left transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
        <h2 className="font-extrabold text-4xl text-gray-900 tracking-tight mb-2.5">
          {tabValue === "signIn" ? "Welcome Back" : "Create Account"}
        </h2>
        <p className="text-gray-500 font-medium text-base leading-relaxed">
          {tabValue === "signIn"
            ? "Enter your credentials to access your illuminated workspace."
            : "Get started with your free secure cloud storage today."}
        </p>
      </div>

      <Tabs defaultValue={tabValue} className="w-full flex flex-col" onValueChange={handleTabValueChange}>
        <TabsList className="bg-gray-100 p-1 rounded-full w-full h-12 mb-6 border border-gray-200/50 flex">
          <TabsTrigger
            value="signIn"
            className="flex-1 rounded-full cursor-pointer py-2.5 font-semibold text-sm transition-all duration-300 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500"
          >
            Sign In
          </TabsTrigger>
          <TabsTrigger
            value="signUp"
            className="flex-1 rounded-full cursor-pointer py-2.5 font-semibold text-sm transition-all duration-300 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500"
          >
            Sign Up
          </TabsTrigger>
        </TabsList>

        <div className="min-h-[160px] flex flex-col justify-start">
          <TabsContent
            value="signIn"
            className="mt-0 space-y-4 focus-visible:outline-none focus-visible:ring-0 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-left-4 duration-300"
          >
            <CustomInput
              Icon={Mail}
              labelTitle="Email Address"
              labelHtmlFor="EmailAddress"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputName="EmailAddress"
            />
          </TabsContent>

          <TabsContent
            value="signUp"
            className="mt-0 space-y-4 focus-visible:outline-none focus-visible:ring-0 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-right-4 duration-300"
          >
            <CustomInput
              Icon={UserRoundPen}
              labelTitle="Full Name"
              labelHtmlFor="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              inputName="fullName"
            />
            <CustomInput
              Icon={Mail}
              labelTitle="Email Address"
              labelHtmlFor="EmailAddress"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputName="Email"
            />
          </TabsContent>
        </div>
      </Tabs>

      <div className="mt-8 flex flex-col gap-4">
        <button
          onClick={handleContinueClick}
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full h-14 rounded-2xl text-white font-bold text-[15px] tracking-wide cursor-pointer transition-all outline-none border-0 bg-gradient-to-r from-[#e14e7a] to-[#f472b6] shadow-[0_8px_20px_-6px_rgba(225,78,122,0.4)] hover:shadow-[0_12px_25px_-6px_rgba(225,78,122,0.5)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span>{tabValue === "signIn" ? "Continue" : "Create Account"}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </>
          )}
        </button>

        {errorMessage && (
          <div className="bg-red-50/70 border border-red-100 rounded-xl py-3.5 px-5 text-red-600 text-sm font-semibold tracking-wide animate-in fade-in zoom-in-95 duration-200 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
            {errorMessage}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 font-medium">
          Demo mode — any valid-looking email will sign you straight in.
        </p>
      </div>
    </div>
  );
};

export default DemoAuth;
