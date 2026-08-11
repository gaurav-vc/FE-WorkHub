import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <div className="rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xl overflow-hidden p-2">
      <DayPicker
        showOutsideDays={showOutsideDays}
        className={cn("p-1", className)}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-3",
          caption: "flex justify-center pt-2 pb-3 relative items-center border-b border-slate-100 dark:border-slate-800",
          caption_label: "text-sm font-semibold tracking-wide text-slate-700 dark:text-slate-200",
          nav: "space-x-1 flex items-center",
          nav_button: "h-7 w-7 bg-transparent p-0 flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors",
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "flex mt-2",
          head_cell: "text-slate-400 dark:text-slate-500 rounded-md w-9 font-medium text-[0.7rem] uppercase tracking-wider",
          row: "flex w-full mt-1.5",
          cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-slate-100/50 [&:has([aria-selected])]:bg-slate-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 mx-0.5",
          day: "h-9 w-9 p-0 font-medium aria-selected:opacity-100 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-700 dark:text-slate-300 inline-flex items-center justify-center disabled:pointer-events-none disabled:opacity-50",
          day_range_end: "day-range-end",
          day_selected: "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-bold shadow-md shadow-primary/20",
          day_today: "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold",
          day_outside: "day-outside text-slate-300 dark:text-slate-600 opacity-50 aria-selected:bg-slate-100/50 aria-selected:text-slate-500 aria-selected:opacity-30",
          day_disabled: "text-slate-300 dark:text-slate-600 opacity-50",
          day_range_middle: "aria-selected:bg-slate-100 aria-selected:text-slate-900",
          day_hidden: "invisible",
          ...classNames,
        }}
        components={{
          IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
          IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
        }}
        {...props}
      />
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
