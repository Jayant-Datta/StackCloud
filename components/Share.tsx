import { Models } from "node-appwrite";
import React from "react";
import FilePreview from "./FilePreview";
import CustomInput from "./CustomInput";
import { Mail } from "lucide-react";

const Share = ({
  file,
  onEmailChange,
}: {
  file: Models.DefaultRow;
  onEmailChange: React.Dispatch<React.SetStateAction<string[]>>;
}) => {
  return (
    <div>
      <FilePreview file={file} />
      <div className="flex items-center justify-center mt-4">
        <span>Share file with other users</span>
      </div>
      <CustomInput
       Icon={Mail}
       labelTitle="Email"
       labelHtmlFor="email"
       onChange={(e) => onEmailChange(e.target.value.trim().split(","))}
       inputName="shareEmail"
       classNames="mt-3"/>

        <div className="mt-4">
            {file?.users?.map((email: string) => {
            return (
            <span key={email} className="□ text-gray-600 font-medium">
            {email}
            </span>
            );
            })}
        </div>
    </div>
  );
};

export default Share;