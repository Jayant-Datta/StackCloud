import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { appwriteConfig } from "./appwrite/appwriteConfig";
import { Models } from "node-appwrite";

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
    case "odt":
    case "rtf":
      return "https://cdn-icons-png.flaticon.com/128/4725/4725970.png";
    case "docx":
      return "https://cdn-icons-png.flaticon.com/128/9496/9496422.png";
    case "txt":
    case "log":
    case "ini":
    case "conf":
    case "env":
      return "https://cdn-icons-png.flaticon.com/128/2306/2306185.png";
    case "svg":
      return "https://cdn-icons-png.flaticon.com/128/2306/2306179.png";
    case "csv":
      return "https://cdn-icons-png.flaticon.com/128/9797/9797918.png";
    case "xls":
    case "xlsx":
    case "ods":
      return "https://cdn-icons-png.flaticon.com/128/9798/9798110.png";
    case "ppt":
    case "pptx":
    case "odp":
      return "https://cdn-icons-png.flaticon.com/128/4726/4726016.png";
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "bmp":
    case "tiff":
    case "tif":
    case "ico":
    case "heic":
    case "avif":
      return "https://cdn-icons-png.flaticon.com/128/4725/4725998.png";
    case "mp4":
    case "mkv":
    case "mov":
    case "avi":
    case "webm":
    case "flv":
    case "wmv":
    case "m4v":
    case "3gp":
      return "https://cdn-icons-png.flaticon.com/128/4726/4726036.png";
    case "mp3":
    case "mpeg":
    case "wav":
    case "aac":
    case "ogg":
    case "flac":
    case "m4a":
    case "wma":
    case "opus":
      return "https://cdn-icons-png.flaticon.com/128/11223/11223019.png";
    case "zip":
    case "rar":
    case "7z":
    case "tar":
    case "gz":
    case "bz2":
    case "xz":
      return "https://cdn-icons-png.flaticon.com/128/2258/2258836.png";
    case "json":
    case "xml":
    case "yml":
    case "yaml":
    case "toml":
      return "https://cdn-icons-png.flaticon.com/128/136/136525.png";
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
    case "mjs":
    case "cjs":
    case "html":
    case "htm":
    case "css":
    case "scss":
    case "less":
    case "cpp":
    case "c":
    case "h":
    case "hpp":
    case "java":
    case "py":
    case "php":
    case "go":
    case "rs":
    case "sql":
    case "sh":
    case "bash":
    case "vue":
    case "svelte":
    case "md":
    case "markdown":
      return "https://cdn-icons-png.flaticon.com/128/15548/15548996.png";
    default:
      return "https://cdn-icons-png.flaticon.com/128/4726/4726038.png";
  }
};

export type AppwriteSupportedType = "audio" | "video" | "document" | "image" | "others";

export const getFileType = (fileName: string): { type: AppwriteSupportedType; extension: string } => {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (!extension || extension === fileName.toLowerCase()) {
    return { type: "others", extension: "" };
  }

  // Documents & spreadsheets & presentations & all code/programming files
  const documentExtensions = [
    // Standard docs
    "txt", "docx", "doc", "pdf", "csv", "xlsx", "xls", "ppt", "pptx", "odt", "rtf", "ods", "odp", "tex", "epub",
    // Programming / web / config / markup docs
    "html", "htm", "css", "scss", "less", "js", "jsx", "ts", "tsx", "mjs", "cjs",
    "json", "xml", "yaml", "yml", "md", "markdown", "py", "sql", "cpp", "c", "h",
    "hpp", "java", "go", "rs", "php", "sh", "bash", "zsh", "vue", "svelte", "env",
    "toml", "graphql", "dockerfile", "log", "ini", "conf", "rb", "swift", "kt", "scala", "dart", "lua", "r"
  ];
  const imageExtensions = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "tiff", "tif", "ico", "svg", "heic", "heif", "avif"];
  const videoExtensions = ["mp4", "mkv", "mov", "avi", "webm", "flv", "wmv", "m4v", "3gp", "3g2", "ogv", "m3u8", "ts", "mpd"];
  const audioExtensions = ["mp3", "mpeg", "wav", "aac", "ogg", "flac", "m4a", "wma", "opus", "mid", "midi", "aiff", "alac", "amr"];

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

  // Everything else (archives, executables, binaries) belongs to "others"
  return { type: "others", extension };
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
      return ["others"];
    default:
      return ["document"];
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

export const getTotalFileSize = (files: Models.DefaultRow[]) => {
  let total = 0;

  files?.forEach((file: Models.DefaultRow) => {
    total += file.size;
  });

  return getFileSize(total);
};

export const getFileSizeByType = (files: Models.DefaultRow[], type: string) => {
  let size = 0;
  let created = "";

  if (type === "document") {
    files.forEach((file) => {
      if (file.type === "document") {
        size += file.size;
        created = formatDateTime(file.$createdAt);
      }
    });
  } else if (type === "image") {
    files.forEach((file) => {
      if (file.type === "image") {
        size += file.size;
        created = formatDateTime(file.$createdAt);
      }
    });
  } else if (type === "media") {
    files.forEach((file) => {
      if (file.type === "video" || file.type === "audio") {
        size += file.size;
        created = formatDateTime(file.$createdAt);
      }
    });
  } else if (type === "other" || type === "others") {
    files.forEach((file) => {
      if (
        file.type !== "document" &&
        file.type !== "image" &&
        file.type !== "video" &&
        file.type !== "audio"
      ) {
        size += file.size;
        created = formatDateTime(file.$createdAt);
      }
    });
  }

  return {
    size: getFileSize(size),
    created,
  };
};

export const SUMMARIZABLE_TEXT_EXTENSIONS = [
  "txt",
  "md",
  "markdown",
  "csv",
  "json",
  "xml",
  "yml",
  "yaml",
  "log",
  "js",
  "ts",
  "jsx",
  "tsx",
  "py",
  "html",
  "css",
] as const;

export const SUMMARIZABLE_AUDIO_EXTENSIONS = ["mp3"] as const;

export const SUMMARIZABLE_VIDEO_EXTENSIONS = ["mp4"] as const;

export const SUMMARIZABLE_EXTENSIONS = [
  "pdf",
  ...SUMMARIZABLE_TEXT_EXTENSIONS,
  ...SUMMARIZABLE_AUDIO_EXTENSIONS,
  ...SUMMARIZABLE_VIDEO_EXTENSIONS,
] as const;

export const MAX_SUMMARIZE_TEXT_SCAN_BYTES = 256 * 1024; // 256 KB opening slice for text/code files
export const MAX_SUMMARIZE_MP3_SCAN_BYTES = 11 * 1024 * 1024; // 11 MB inline opening clip for oversized MP3s
export const MAX_SUMMARIZE_MP4_SCAN_BYTES = 28 * 1024 * 1024; // 28 MB trimmed opening clip for oversized MP4s
export const MAX_SUMMARIZE_SCANNED_PDF_BYTES = 48 * 1024 * 1024; // 48 MB Gemini Files limit for scanned/image PDFs
export const MAX_SUMMARIZE_PDF_DOWNLOAD_BYTES = 100 * 1024 * 1024; // 100 MB max for local first-8-pages PDF text extraction

export type SummarizableKind = "document" | "media";

export const getNormalizedExtension = (
  extension?: string | null,
  fileName?: string | null
) => {
  const raw =
    extension && extension.trim().length > 0
      ? extension
      : fileName?.split(".").pop() ?? "";
  return raw.replace(/^\./, "").trim().toLowerCase();
};

export const getSummarizableKind = (
  extension?: string | null,
  fileName?: string | null
): SummarizableKind | null => {
  const ext = getNormalizedExtension(extension, fileName);
  if (!ext) return null;

  if (
    (SUMMARIZABLE_AUDIO_EXTENSIONS as readonly string[]).includes(ext) ||
    (SUMMARIZABLE_VIDEO_EXTENSIONS as readonly string[]).includes(ext)
  ) {
    return "media";
  }

  if (
    ext === "pdf" ||
    (SUMMARIZABLE_TEXT_EXTENSIONS as readonly string[]).includes(ext)
  ) {
    return "document";
  }

  return null;
};

export const isSummarizableFile = (
  extension?: string | null,
  fileName?: string | null
) => {
  return getSummarizableKind(extension, fileName) !== null;
};

export const EDITABLE_TEXT_EXTENSIONS = [
  "txt",
  "md",
  "markdown",
  "json",
  "js",
  "jsx",
  "ts",
  "tsx",
  "mjs",
  "cjs",
  "html",
  "htm",
  "css",
  "scss",
  "less",
  "py",
  "sql",
  "cpp",
  "c",
  "h",
  "hpp",
  "java",
  "go",
  "rs",
  "php",
  "yaml",
  "yml",
  "xml",
  "svg",
  "sh",
  "bash",
  "csv",
  "env",
  "toml",
  "graphql",
  "dockerfile",
  "log",
] as const;

export const isEditableFile = (
  extension?: string | null,
  fileName?: string | null
): boolean => {
  const ext = getNormalizedExtension(extension, fileName);
  if (!ext) return false;
  return (EDITABLE_TEXT_EXTENSIONS as readonly string[]).includes(ext);
};
