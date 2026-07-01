import dashboard from '../public/dashboard-svgrepo-com.svg'
import documents from '../public/documents-svgrepo-com.svg'
import Images from '../public/images-svgrepo-com.svg'
import Media from '../public/media-audio-svgrepo-com.svg'
import others from '../public/pie-chart-svgrepo-com.svg'

import FolderPen from '../public/pen-square-svgrepo-com.svg'
import Info from '../public/information-svgrepo-com (1).svg'
import Share from '../public/share-svgrepo-com.svg'
import Download from '../public/download-svgrepo-com.svg'
import Trash from '../public/trash-svgrepo-com.svg'



export const SIDEBAR_ITEMS = [
  {
    name: "Dashboard",
    icon: dashboard,
    url: "/",
  },
  {
    name: "Documents",
    icon: documents,
    url: "/documents",
  },
  {
    name: "Images",
    icon: Images,
    url: "/images",
  },
  {
    name: "Media",
    icon: Media,
    url: "/media",
  },
  {
    name: "Others",
    icon: others,
    url: "/others",
  },
];


export const MAX_FILE_SIZE= 50*1024*1024; 

export const ACTION_ITEMS = [
  {
    value: "rename",
    label: "Rename",
    icon: FolderPen,
    iconColor: "text-bright-turquoise",
    iconBgColor: "bg-bright-turquoise/10",
  },
  {
    value: "details",
    label: "Details",
    icon: Info,
    iconColor: "text-froly",
    iconBgColor: "bg-froly/10",
  },
  {
    value: "share",
    label: "Share",
    icon: Share,
    iconColor: "text-flameco",
    iconBgColor: "bg-flameco/10",
  },
  {
    value: "download",
    label: "Download",
    icon: Download,
    iconColor: "text-cornflower-blue",
    iconBgColor: "bg-cornflower-blue/10",
  },
  {
    value: "delete",
    label: "Delete",
    icon: Trash,
    iconColor: "text-persimmon",
    iconBgColor: "bg-persimmon/10",
  },
];

export const FILTER_TYPES = [
  {
    label: "Name (A-Z)",
    value: "name-asc",
  },
  {
    label: "Name (Z-A)",
    value: "name-desc",
  },
  {
    label: "Date Created (Newest)",
    value: "$createdAt-desc",
  },
  {
    label: "Date Created (Oldest)",
    value: "$createdAt-asc",
  },
  {
    label: "Size (Highest)",
    value: "size-desc",
  },
  {
    label: "Size (Lowest)",
    value: "size-asc",
  },
];

export const FILE_CARDS = [
  {
    id: "document",
    title: "Documents",
    imgSrc: "https://cdn-icons-png.flaticon.com/128/10309/10309617.png",
    bgColor: "bg-blue-500",
  },
  {
    id: "image",
    title: "Images",
    imgSrc: "https://cdn-icons-png.flaticon.com/128/9261/9261193.png",
    bgColor: "bg-persian-pink",
  },
  {
    id: "media",
    title: "Media",
    imgSrc: "https://cdn-icons-png.flaticon.com/128/8407/8407947.png",
    bgColor: "bg-persimmon",
  },
  {
    id: "other",
    title: "Others",
    imgSrc: "https://cdn-icons-png.flaticon.com/128/3059/3059838.png",
    bgColor: "bg-jaffa",
  },
];