import { Search } from 'lucide-react';
import { Models } from 'node-appwrite';
import React, { useState } from 'react'
import { Input } from './ui/input';
import Preview from './Preview';
import { formatDateTime, getFileSize } from '@/lib/utils';
import { getFiles } from '@/lib/appwrite/file.action';
import { useRouter } from 'next/navigation';

const FileSearch = () => {
    const router = useRouter()
  const [searchResults, setSearchResults] = useState<Models.DefaultRow[]>();
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchText, setSearchText] = useState("");

   const handleFetchSearchFile = async (searchQuery: string) => {
   if (!searchQuery) {
    setShowSearchResults(false);
    return;
  }

  setSearchText(searchQuery);

  const files = await getFiles({ types: [], query: searchQuery });

  setSearchResults(files?.rows);
  setShowSearchResults(true);
};


const myDebouncing = <T,>(cb: (value: T) => void, interval: number) => {
 let timer: ReturnType<typeof setTimeout>
  return function (value : T) {
    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      cb(value);
    }, interval);
  };
};

const debounce = myDebouncing(handleFetchSearchFile, 500);

const handleSearchItemClick = (file: Models.DefaultRow) => {
  const { type } = file || {};
  const formattedFileType =
    type === "audio" || type === "video" ? "media" : `${type}s`;

  const path = `/${formattedFileType}?query=${searchText}`;
  router.push(path);
  setShowSearchResults(false);
};
return (
  // BEFORE: <div className="w-120 rounded-4xl flex items-center justify-center relative">
  // CHANGED: Locked height to exactly h-12 so it can never expand the header. Adjusted width for better proportions.
  <div className="w-[450px] h-12 relative flex items-center">
    
    {/* BEFORE: <Search className="absolute left-4 w-6 h-6 text-gray-400" /> */}
    {/* CHANGED: Made the icon slightly smaller (w-5 h-5) to look more premium and added pointer-events-none */}
    <Search className="absolute left-4 w-5 h-5 text-gray-400 pointer-events-none" />
    
    {/* BEFORE: <Input className="rounded-[3rem] bg-athens-gray shadow outline-none pl-10.5 py-5.5" ... /> */}
    {/* CHANGED: Swapped back to native <input> to kill Shadcn gray border glitches. Removed heavy shadow. Forced h-full to respect the h-12 wrapper. */}
    <input
      type="text"
      className="w-full h-full rounded-full bg-gray-100 border border-transparent px-12 text-base text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:bg-white focus:border-froly focus:ring-1 focus:ring-froly shadow-none"
      placeholder="Search your file"
      onChange={(e) => { debounce(e.target.value) }}
    />

    {showSearchResults && searchResults && searchResults.length > 0 && (
      // BEFORE: <ul className="w-full flex flex-col gap-4 absolute top-14 ...">
      // CHANGED: Improved dropdown UI with tighter gap, better padding, and a subtle border.
      <ul className="absolute top-14 left-0 w-full flex flex-col gap-1 bg-white shadow-xl border border-gray-100 p-2 rounded-2xl max-h-96 overflow-y-auto z-50">
        {searchResults.map((item: Models.DefaultRow) => {
          return (
            <li
              key={item.$id}
              // CHANGED: Added rounded-xl and hover:bg-gray-50 for a smooth hover effect on search items.
              className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors"
              onClick={() => { handleSearchItemClick(item) }}
            >
              <Preview
                type={item.type}
                extension={item.extension}
                url={item.url}
                imgClassNames="w-8 h-8"
                classNames="w-12 h-12 flex-shrink-0"
              />
              <div className="flex flex-col overflow-hidden">
                <span className="font-medium text-gray-700 truncate">{item.name}</span>
                <span className="text-gray-400 text-xs mt-0.5">
                  {getFileSize(item.size)} • {formatDateTime(item.$createdAt)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    )}
  </div>
);
}

export default FileSearch