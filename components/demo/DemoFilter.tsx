"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_TYPES } from "@/lib/constants";

const DemoFilter = ({ onSort }: { onSort: (value: string) => void }) => {
  return (
    <Select onValueChange={onSort} defaultValue={FILTER_TYPES[0].value}>
      <SelectTrigger className="w-45">
        <SelectValue placeholder={FILTER_TYPES[0].value} />
      </SelectTrigger>
      <SelectContent position="popper">
        <SelectGroup>
          {FILTER_TYPES.map((filter) => (
            <SelectItem key={filter.value} value={filter.value}>
              {filter.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default DemoFilter;
