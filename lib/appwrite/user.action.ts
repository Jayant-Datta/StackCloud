"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from ".";
import { appwriteConfig } from "./appwriteConfig";
import { cookies } from "next/headers";
import path from "node:path";
import { redirect } from "next/navigation";
import { parseObj } from "../utils";

export const getUserByEmail = async (email: string) => {
    try {
        const { databases } = await createAdminClient();

        const result = await databases.listRows({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.usersCollectionId,
            queries: [Query.equal("email", [email])]
        });

        return result.total > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error("Error in getUserByEmail:", error);
        throw error; 
    }
};

export const sendEmailOTP = async (email: string) => {
    try {
        const { account } = await createAdminClient();

        const session = await account.createEmailToken({
            userId: ID.unique(),
            email,
        });

        return session.userId;
    } catch (error) {
        console.error("Failed to send email OTP:", error);
        return null;
    }
};

export const createAccount = async ({ fullName, email }: { fullName: string; email: string; }) => {
    try {
        const existingUser = await getUserByEmail(email);
        const accountId = await sendEmailOTP(email);

        if (!accountId) {
            return { accountId: null, message: "Failed to send OTP token." };
        }

        if (!existingUser) {
            const { databases } = await createAdminClient();

            await databases.createRow({
                databaseId: appwriteConfig.databaseId,
                tableId: appwriteConfig.usersCollectionId,
                rowId: ID.unique(),
                data: {
                    fullName: fullName || "New User",
                    email,
                    avatar: "",
                    accountid: accountId,
                }
            });
        }

        return { accountId, message: "OTP sent successfully!" };
    } catch (error) {
        console.error("Detailed Server Error during authentication:", error);
        const errorMessage = error instanceof Error ? error.message : "Database operation failed.";
        return { accountId: null, message: errorMessage };
    }
};


export const signInUser = async (email: string ) => {
    const existingUser = await getUserByEmail(email);

    if(!existingUser){
        return {accountId: null , message: "Failed to Sign In, User does not exist "};
    }

    const accountId = await sendEmailOTP(email);

    return {accountId, message : ""};
}

export const VerifySecret = async ({accountId, password}: {accountId: string; password: string}) =>{
    try{
      const {account} = await createAdminClient();
      
      const session = await account.createSession({
        userId: accountId,
        secret: password
      });

      const cookieStore = await cookies();
      cookieStore.set("appwrite-session", session.$id,
        {
        path: "/",
        httpOnly: true,
        sameSite: "strict",
        secure: true
      });
      
      cookieStore.set("appwrite-user-id", accountId,
        {
        path: "/",
        httpOnly: true,
        sameSite: "strict",
        secure: true
      });

     return {sessionId:session.$id}
    } catch(error){
        console.log("Failed to verify OTP", error);
    }

}


// 1.cookieStore -> appwrite-session
// 2.call createAdminClient() => account
// 3. acccount -> delete the session by passing the id
// 4. clear the cookie -> appwrite-session appwrite-userid

export const signOutuser = async () => {
  const cookieStore = await cookies();
  
  try {
    const sessionId = cookieStore.get("appwrite-session");
    if (sessionId?.value) {
      const { account } = await createAdminClient();
      
      try {
        await account.deleteSession({ sessionId: sessionId.value });
      } catch (error) {
        console.log("Failed to delete the session from appwrite", error);
      }
    }
  } catch (error) {
    console.log("Error during logout", error);
  } finally {
    cookieStore.delete("appwrite-session");
    cookieStore.delete("appwrite-user-id");
  }

  redirect("/auth");
};

export const getCurrentUser = async () => {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("appwrite-user-id");

    

    if (!userId?.value) {
      return null;
    }

    const { databases } = await createAdminClient();

    const user = await databases.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.usersCollectionId,
      queries: [Query.equal("accountid", [userId.value])],
    });

    return user.total > 0 ? parseObj(user.rows[0]) : null;
  } catch (error) {
    
    console.log("Error while fetching the current user", error);
    return null;
  }
};