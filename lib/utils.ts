import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { appwriteConfig } from "./appwrite/appwriteConfig";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const isValid = ( email: string) =>{
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return regex.test(email);
}

export const parseObj = (obj: unknown) => {
  return JSON.parse(JSON.stringify(obj));
};

export const getFileIcon = (extension: string) => {
  const ext = extension.replace(".", "").toLowerCase();

  switch (ext) {
    case "pdf":
      return "https://cdn-icons-png.flaticon.com/128/4726/4726010.png";
    case "doc":
      return "https://cdn-icons-png.flaticon.com/128/4725/4725970.png";
    case "docx":
      return "https://cdn-icons-png.flaticon.com/128/9496/9496422.png";
    case "txt":
      return "https://cdn-icons-png.flaticon.com/128/2306/2306185.png";
    case "svg":
      return "https://cdn-icons-png.flaticon.com/128/2306/2306179.png";
    case "csv":
      return "https://cdn-icons-png.flaticon.com/128/9797/9797918.png";
    case "xls":
    case "xlsx":
      return "https://cdn-icons-png.flaticon.com/128/9798/9798110.png";
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "bmp":
    case "tiff":
    case "ico":
      return "https://cdn-icons-png.flaticon.com/128/4725/4725998.png";
    case "mp4":
    case "mkv":
    case "mov":
    case "avi":
    case "webm":
    case "flv":
      return "https://cdn-icons-png.flaticon.com/128/4726/4726036.png";
    case "mp3":
    case "mpeg":
    case "wav":
    case "aac":
    case "ogg":
    case "flac":
    case "m4a":
      return "https://cdn-icons-png.flaticon.com/128/11223/11223019.png";
    case "zip":
    case "rar":
    case "7z":
    case "tar":
    case "gz":
      return "https://cdn-icons-png.flaticon.com/128/2258/2258836.png";
    case "json":
    case "xml":
    case "yml":
    case "yaml":
      return "https://cdn-icons-png.flaticon.com/128/136/136525.png";
    case "js":
    case "ts":
    case "html":
    case "css":
    case "cpp":
      return "https://cdn-icons-png.flaticon.com/128/15548/15548996.png";
    default:
      return "https://cdn-icons-png.flaticon.com/128/4726/4726038.png";
  }
};


export const getFileType = (fileName: string) => {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (!extension) {
    return { type: "other", extension: "" };
  }

  const documentExtensions = ["txt", "docx", "doc", "pdf", "csv", "xlsx", "xls"];
  const imageExtensions = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "tiff", "ico", "svg"];
  const videoExtensions = ["mp4", "mkv", "mov", "avi", "webm", "flv", "wmv", "m4v"];
  const audioExtensions = ["mp3", "mpeg", "wav", "aac", "ogg", "flac", "m4a", "wma"];
  const archiveExtensions = ["zip", "rar", "7z", "tar", "gz", "bz2", "xz"];
  const codeExtensions = ["js", "ts", "html", "css", "cpp", "c", "java", "py", "php", "go", "rs", "jsx", "tsx", "vue", "json", "xml", "yml", "yaml"];
  const videoStreamingExtensions = ["m3u8", "ts", "mpd"];

  if (documentExtensions.includes(extension)) {
    return { type: "document", extension };
  }

  if (imageExtensions.includes(extension)) {
    return { type: "image", extension };
  }

  if (videoExtensions.includes(extension)) {
    return { type: "video", extension };
  }

  if (audioExtensions.includes(extension)) {
    return { type: "audio", extension };
  }

  if (archiveExtensions.includes(extension)) {
    return { type: "archive", extension };
  }

  if (codeExtensions.includes(extension)) {
    return { type: "code", extension };
  }

  if (videoStreamingExtensions.includes(extension)) {
    return { type: "video", extension };
  }

  return { type: "other", extension };
};


export const convertFileToUrl = (file: File) => {
  return URL.createObjectURL(file);
};


export const constructFileUrl = (bucketFileId: string) => {
  return `${appwriteConfig.endpointUrl}/storage/buckets/${appwriteConfig.bucketId}/files/${bucketFileId}/view?project=${appwriteConfig.projectId}`;
};

export const constructDownloadUrl = (bucketFileId: string) => {
  return `${appwriteConfig.endpointUrl}/storage/buckets/${appwriteConfig.bucketId}/files/${bucketFileId}/download?project=${appwriteConfig.projectId}`;
};

export const getFileTypeParams = (type: string) => {
  switch (type) {
    case "documents":
      return ["document"];
    case "images":
      return ["image"];
    case "media":
      return ["audio", "video"];
    case "others":
      return ["other"];
    default:
      return ["document"]
  }
};

export const getFileSize = (sizeInBytes: number) => {
  if (sizeInBytes < 1024) {
    return sizeInBytes + " Bytes";
  } else if (sizeInBytes < 1024 * 1024) {
    const sizeInKb = sizeInBytes / 1024;
    return sizeInKb.toFixed(1) + " kB";
  } else if (sizeInBytes < 1024 * 1024 * 1024) {
    const sizeInMb = sizeInBytes / (1024 * 1024);
    return sizeInMb.toFixed(1) + " MB";
  } else {
    const sizeInGb = sizeInBytes / (1024 * 1024 * 1024);
    return sizeInGb.toFixed(1) + " GB";
  }
};

export const formatDateTime = (isoString: string) => {
  const date = new Date(isoString);
  
  const month = date.toLocaleString("en-IN", { month: "short" });
  const day = date.getDate();
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
};