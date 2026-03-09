import { useState, useEffect, useCallback } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { isToday, startOfDay, endOfWeek, startOfWeek } from "date-fns";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
}

export type FilterValues = Record<string, string>;

interface FilterBarProps {
  filters: FilterConfig[];
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  storageKey?: string;
}

export function useFilterBar(filters: FilterConfig[], storageKey?: string) {
  const [values, setValues] = useState<FilterValues>(() => {
    if (storageKey) {
      try {
        const stored = sessionStorage.getItem(`hub-filters-${storageKey}`);
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return Object.fromEntries(filters.map((f) => [f.key, "all"]));
  });

  useEffect(() => {
    if (storageKey) {
      sessionStorage.setItem(`hub-filters-${storageKey}`, JSON.stringify(values));
    }
  }, [values, storageKey]);

  // Ensure new filter keys get default "all"
  useEffect(() => {
    const updated = { ...values };
    let changed = false;
    for (const f of filters) {
      if (!(f.key in updated)) {
        updated[f.key] = "all";
        changed = true;
      }
    }
    if (changed) setValues(updated);
  }, [filters]);

  return { values, setValues };
}

export function applyDueDateFilter(dueAt: string | null | undefined, filterValue: string): boolean {
  if (filterValue === "all") return true;
  if (!dueAt) return filterValue === "no_date";
  const due = startOfDay(new Date(dueAt));
  const today = startOfDay(new Date());
  switch (filterValue) {
    case "overdue":
      return due < today;
    case "today":
      return isToday(due);
    case "this_week": {
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      return due >= weekStart && due <= weekEnd;
    }
    default:
      return true;
  }
}

export const PRIORITY_FILTER_OPTIONS: FilterOption[] = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const DUE_DATE_FILTER_OPTIONS: FilterOption[] = [
  { value: "today", label: "Due Today" },
  { value: "this_week", label: "Due This Week" },
  { value: "overdue", label: "Overdue" },
];

export default function FilterBar({ filters, values, onChange }: FilterBarProps) {
  const activeFilters = filters.filter((f) => values[f.key] && values[f.key] !== "all");

  const handleChange = useCallback(
    (key: string, value: string) => {
      onChange({ ...values, [key]: value });
    },
    [values, onChange]
  );

  const handleRemove = useCallback(
    (key: string) => {
      onChange({ ...values, [key]: "all" });
    },
    [values, onChange]
  );

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {filters.map((filter) => (
          <Select
            key={filter.key}
            value={values[filter.key] || "all"}
            onValueChange={(v) => handleChange(filter.key, v)}
          >
            <SelectTrigger className="w-auto min-w-[130px] h-8 text-xs">
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {filter.label}</SelectItem>
              {filter.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>
      {activeFilters.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {activeFilters.map((filter) => {
            const opt = filter.options.find((o) => o.value === values[filter.key]);
            return (
              <Badge
                key={filter.key}
                variant="outline"
                className="text-[11px] gap-1 cursor-pointer hover:bg-destructive/10"
                onClick={() => handleRemove(filter.key)}
              >
                {filter.label}: {opt?.label || values[filter.key]}
                <X className="h-3 w-3" />
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
