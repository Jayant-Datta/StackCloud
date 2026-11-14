export type MockFileType = "document" | "image" | "video" | "audio" | "other";

export type MockFile = {
  $id: string;
  name: string;
  type: MockFileType;
  extension: string;
  size: number;
  url: string;
  bucketFileId: string;
  $createdAt: string;
  $updatedAt: string;
};

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString();

export const MOCK_USER = {
  $id: "demo-user-1",
  fullName: "Alex Carter",
  accountid: "demo-account-1",
};

export const getFileSizeLabel = (sizeInBytes: number) => {
  if (sizeInBytes < 1024) return sizeInBytes + " Bytes";
  if (sizeInBytes < 1024 * 1024) return (sizeInBytes / 1024).toFixed(1) + " kB";
  if (sizeInBytes < 1024 * 1024 * 1024) return (sizeInBytes / (1024 * 1024)).toFixed(1) + " MB";
  return (sizeInBytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
};

export const computeTotalSize = (files: MockFile[]) =>
  getFileSizeLabel(files.reduce((total, file) => total + file.size, 0));

export const computeSizeByCategory = (files: MockFile[], category: string) => {
  const matches = files.filter((file) => {
    if (category === "document") return file.type === "document";
    if (category === "image") return file.type === "image";
    if (category === "media") return file.type === "audio" || file.type === "video";
    return file.type === "other";
  });

  const size = matches.reduce((total, file) => total + file.size, 0);
  const created = matches.length
    ? matches.reduce((latest, file) => (file.$createdAt > latest ? file.$createdAt : latest), matches[0].$createdAt)
    : "";

  return { size: getFileSizeLabel(size), created };
};

export const INITIAL_MOCK_FILES: MockFile[] = [
  { $id: "1", name: "Q3-Financial-Report.pdf", type: "document", extension: "pdf", size: 2_516_582, url: "https://cdn-icons-png.flaticon.com/128/4726/4726010.png", bucketFileId: "b1", $createdAt: iso(12), $updatedAt: iso(1) },
  { $id: "2", name: "Project-Proposal.docx", type: "document", extension: "docx", size: 870_400, url: "https://cdn-icons-png.flaticon.com/128/9496/9496422.png", bucketFileId: "b2", $createdAt: iso(20), $updatedAt: iso(3) },
  { $id: "3", name: "Meeting-Notes.txt", type: "document", extension: "txt", size: 12_800, url: "https://cdn-icons-png.flaticon.com/128/2306/2306185.png", bucketFileId: "b3", $createdAt: iso(8), $updatedAt: iso(8) },
  { $id: "4", name: "Budget-Sheet.xlsx", type: "document", extension: "xlsx", size: 441_200, url: "https://cdn-icons-png.flaticon.com/128/9798/9798110.png", bucketFileId: "b4", $createdAt: iso(30), $updatedAt: iso(5) },
  { $id: "5", name: "sunset-beach.jpg", type: "image", extension: "jpg", size: 3_250_000, url: "https://cdn-icons-png.flaticon.com/128/4725/4725998.png", bucketFileId: "b5", $createdAt: iso(4), $updatedAt: iso(2) },
  { $id: "6", name: "team-photo.png", type: "image", extension: "png", size: 5_400_000, url: "https://cdn-icons-png.flaticon.com/128/4725/4725998.png", bucketFileId: "b6", $createdAt: iso(15), $updatedAt: iso(15) },
  { $id: "7", name: "logo-design.svg", type: "image", extension: "svg", size: 46_000, url: "https://cdn-icons-png.flaticon.com/128/2306/2306179.png", bucketFileId: "b7", $createdAt: iso(40), $updatedAt: iso(6) },
  { $id: "8", name: "product-mockup.png", type: "image", extension: "png", size: 2_900_000, url: "https://cdn-icons-png.flaticon.com/128/4725/4725998.png", bucketFileId: "b8", $createdAt: iso(2), $updatedAt: iso(2) },
  { $id: "9", name: "podcast-episode-12.mp3", type: "audio", extension: "mp3", size: 34_500_000, url: "https://cdn-icons-png.flaticon.com/128/11223/11223019.png", bucketFileId: "b9", $createdAt: iso(9), $updatedAt: iso(9) },
  { $id: "10", name: "demo-walkthrough.mp4", type: "video", extension: "mp4", size: 48_200_000, url: "https://cdn-icons-png.flaticon.com/128/4726/4726036.png", bucketFileId: "b10", $createdAt: iso(1), $updatedAt: iso(1) },
  { $id: "11", name: "background-music.wav", type: "audio", extension: "wav", size: 18_100_000, url: "https://cdn-icons-png.flaticon.com/128/11223/11223019.png", bucketFileId: "b11", $createdAt: iso(25), $updatedAt: iso(4) },
  { $id: "12", name: "archive-backup.zip", type: "other", extension: "zip", size: 15_800_000, url: "https://cdn-icons-png.flaticon.com/128/2258/2258836.png", bucketFileId: "b12", $createdAt: iso(50), $updatedAt: iso(10) },
  { $id: "13", name: "config.json", type: "other", extension: "json", size: 4_200, url: "https://cdn-icons-png.flaticon.com/128/136/136525.png", bucketFileId: "b13", $createdAt: iso(3), $updatedAt: iso(3) },
];
