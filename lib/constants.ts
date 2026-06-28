import dashboard from '../public/dashboard-svgrepo-com.svg'
import documents from '../public/documents-svgrepo-com.svg'
import Images from '../public/images-svgrepo-com.svg'
import Media from '../public/media-audio-svgrepo-com.svg'
import others from '../public/pie-chart-svgrepo-com.svg'


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