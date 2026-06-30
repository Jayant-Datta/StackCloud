"use server";
import { ID, Models, Query } from "node-appwrite"; 
import { InputFile } from "node-appwrite/file"; 
import { createAdminClient } from ".";
import { appwriteConfig } from "./appwriteConfig";
import { constructFileUrl, getFileType, parseObj } from "../utils";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./user.action";
import { RenameFile } from "../types";

export const uploadFile = async ({
  file,
  ownerId,
  accountId,
  path,
}: {
  file: File;
  ownerId: string;
  accountId: string;
  path: string;
}) => {
  const { storage, databases } = await createAdminClient();
  // databases is a TablesDB instance — use its row methods directly, no cast needed

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const inputFile = InputFile.fromBuffer(buffer, file.name);

    const bucketFile = await storage.createFile({
      bucketId: appwriteConfig.bucketId,
      fileId: ID.unique(),
      file: inputFile,
    });

    const fileDocument = {
      type: getFileType(bucketFile.name).type,
      name: bucketFile.name,
      url: constructFileUrl(bucketFile.$id),
      extension: getFileType(bucketFile.name).extension,
      size: bucketFile.sizeOriginal,
      owner: [ownerId], 
      accountId,
      users: [],
      bucketFileId: bucketFile.$id,
      ownerId,
    };

    const newFile = await databases.createRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.filesCollectionId,
      rowId: ID.unique(),
      data: fileDocument,
    }).catch(async (error: unknown) => {
      await storage.deleteFile({
        bucketId: appwriteConfig.bucketId,
        fileId: bucketFile.$id,
      });
      console.log("Failed to create file document, rolled back storage:", error);
      throw error; 
    });

    revalidatePath(path);
    return parseObj(newFile);

  } catch (error) {
    console.log("Failed to upload file", error);
    return null;
  }
};

const createQueries = (
  currentUser: Models.Document & { email: string }, 
  types: string[],
  query: string,
  filter: string,
) => {
  const queries = [
    Query.or([
      Query.equal("ownerId", currentUser.$id),
      Query.contains("users", currentUser.email), 
    ]),
  ];

  if (types.length > 0) {
    queries.push(Query.equal("type", types));
  }

  return queries;
};

export const getFiles = async ({
  types = [],
  query,
  filter = "createdAt-asc",
}: {
  types: string[];
  query: string;
  filter?: string;
}) => {
  const { databases } = await createAdminClient();

  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      console.log("User not found");
      return null;
    }

    const queries = createQueries(currentUser as Models.Document & { email: string }, types, query, filter);

    const files = await databases.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.filesCollectionId,
      queries,
    });

    return parseObj(files);
  } catch (error) {
    console.log("Failed to retrieve files", error);
    return null;
  }
};

export const getTotalSpaceUsed = async () => {
  try {
    const { databases } = await createAdminClient();
    const currentUser = await getCurrentUser();

    if (!currentUser) return 0;

    // Fetch ALL files for this user without type filters
    const files = await databases.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.filesCollectionId,
      // NOTE: Make sure "accountId" or "owner" matches how you tie a file to a user in Appwrite!
      queries: [Query.equal("accountId", [currentUser.accountid])], 
    });

    // Reduce the array to calculate the total sum of the 'size' attribute
    const totalSpace = files.rows.reduce((acc: number, file: Models.DefaultRow) => acc + file.size, 0);

    return totalSpace; // Returns total size in Bytes
  } catch (error) {
    console.log("Failed to calculate total space", error);
    return 0;
  }
};

export const renameFile = async ({
  fileId,
  name,
  extension,
  path,
}: RenameFile) => {
  const { databases } = await createAdminClient();

  try {
    const newFileName = `${name}.${extension}`;
    const updatedFile = await databases.updateRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.filesCollectionId,
      rowId: fileId,
      data: {
        name: newFileName,
      },
    });

    revalidatePath(path);

    return parseObj(updatedFile);
  } catch (error) {
    console.log("Failed to rename the file", error);
  }
};