import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface AdminDateFilterProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  showToday?: boolean;
}

const AdminDateFilter = ({ date, onDateChange, showToday = true }: AdminDateFilterProps) => {
  return (
    <div className="flex items-center gap-2">
      {showToday && (
        <Button
          variant={!date || format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'default' : 'outline'}
          size="sm"
          onClick={() => onDateChange(new Date())}
        >
          Today
        </Button>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn('gap-2', !date && 'text-muted-foreground')}>
            <CalendarIcon className="h-4 w-4" />
            {date ? format(date, 'PPP') : 'Pick date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={onDateChange}
            initialFocus
            className={cn('p-3 pointer-events-auto')}
          />
        </PopoverContent>
      </Popover>
      {date && (
        <Button variant="ghost" size="sm" onClick={() => onDateChange(undefined)} className="text-xs">
          Clear
        </Button>
      )}
    </div>
  );
};

export default AdminDateFilter;
