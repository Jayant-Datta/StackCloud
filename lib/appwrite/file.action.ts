"use server";
import { AppwriteException, ID, Models, Query } from "node-appwrite"; 
import { InputFile } from "node-appwrite/file"; 
import { createAdminClient } from ".";
import { appwriteConfig } from "./appwriteConfig";
import { constructFileUrl, getFileType, parseObj } from "../utils";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./user.action";
import { DeleteFile, RenameFile, ShareFile } from "../types";

function formatUploadError(error: unknown): string {
  if (error instanceof AppwriteException) {
    if (error.type === "limit_file_size_exceeded") {
      return "Appwrite Cloud Free caps each uploaded file at 50 MB. Upgrade your Appwrite plan (or self-host Appwrite) to upload files larger than 50 MB.";
    }
    if (
      error.type === "storage_file_size_not_allowed" ||
      /file size|maximum size|too large|exceed/i.test(error.message)
    ) {
      return `${error.message} Check your Appwrite bucket's Maximum file size setting.`;
    }
    if (error.message) {
      return `Appwrite error (${error.code || "upload"}): ${error.message}`;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Your Appwrite storage bucket rejected the file.";
}

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
}): Promise<Models.DefaultRow | { uploadError: string }> => {
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
    return parseObj(newFile) as Models.DefaultRow;

  } catch (error) {
    console.log("Failed to upload file", error);
    return { uploadError: formatUploadError(error) };
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

  if (query) {
  queries.push(Query.search("name", query));
}

  // filter
if (filter) {
  const [sortBy, filterBy] = filter.split("-");
  if (filterBy === "asc") {
    queries.push(Query.orderAsc(sortBy));
  }
  if (filterBy === "desc") {
    queries.push(Query.orderDesc(sortBy));
  }
}

  return queries;
};

export const getFiles = async ({
  types = [],
  query,
  filter = "$createdAt-asc",
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

export const getFileOwnerDetails = async (ownerId: string) => {
  const { databases } = await createAdminClient();

  try {
    const user = await databases.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.usersCollectionId,
      queries: [Query.equal("$id", ownerId)],
    });

    return user.total > 0 ? parseObj(user.rows[0]) : null;
  } catch (error) {
    console.log("Failed to fetch owner details", error);
  }
};

export const shareFile = async ({ fieldId, emails, path }: ShareFile) => {
  const { databases } = await createAdminClient();

  try {
    const updatedFile = await databases.updateRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.filesCollectionId,
      rowId: fieldId,
      data: {
        users: emails,
      },
    });

    revalidatePath(path);

    return parseObj(updatedFile);
  } catch (error) {
    console.log("Failed to share the file", error);
  }
};


export const deleteFile = async ({
  fileId,
  bucketFileId,
  path,
}: DeleteFile) => {
  const { storage, databases } = await createAdminClient();

  try {
    const deletedFile = await databases.deleteRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.filesCollectionId,
      rowId: fileId,
    });

    if (deletedFile) {
      await storage.deleteFile({
        bucketId: appwriteConfig.bucketId,
        fileId: bucketFileId,
      });
    }

    revalidatePath(path);

    return parseObj({ message: "File deleted successfully" });
  } catch (error) {
    console.log("Failed to delete the file", error);
  }
};

export const updateFileContent = async ({
  fileId,
  bucketFileId,
  fileName,
  content,
  path = "",
}: {
  fileId: string;
  bucketFileId: string;
  fileName: string;
  content: string;
  path?: string;
}) => {
  const { storage, databases } = await createAdminClient();

  try {
    const buffer = Buffer.from(content, "utf-8");
    const inputFile = InputFile.fromBuffer(buffer, fileName);

    const newBucketFile = await storage.createFile({
      bucketId: appwriteConfig.bucketId,
      fileId: ID.unique(),
      file: inputFile,
    });

    const updatedRow = await databases.updateRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.filesCollectionId,
      rowId: fileId,
      data: {
        bucketFileId: newBucketFile.$id,
        size: newBucketFile.sizeOriginal,
        url: constructFileUrl(newBucketFile.$id),
      },
    });

    if (bucketFileId && bucketFileId !== newBucketFile.$id) {
      await storage
        .deleteFile({
          bucketId: appwriteConfig.bucketId,
          fileId: bucketFileId,
        })
        .catch(() => {});
    }

    if (path) {
      revalidatePath(path);
    }

    return parseObj(updatedRow);
  } catch (error) {
    console.log("Failed to update file content", error);
    return null;
  }
};

export const getFileById = async (fileId: string) => {
  const { databases } = await createAdminClient();
  try {
    const file = await databases.getRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.filesCollectionId,
      rowId: fileId,
    });
    return parseObj(file);
  } catch (error) {
    console.log("Failed to get file by ID", error);
    return null;
  }
};

export const getFileTextContent = async (bucketFileId: string) => {
  const { storage } = await createAdminClient();
  try {
    const arrayBuffer = await storage.getFileDownload({
      bucketId: appwriteConfig.bucketId,
      fileId: bucketFileId,
    });
    return Buffer.from(arrayBuffer).toString("utf-8");
  } catch (error) {
    console.log("Failed to fetch file text content", error);
    return "";
  }
};
