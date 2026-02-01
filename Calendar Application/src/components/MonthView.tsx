import { Event } from './Calendar';
import { Avatar, AvatarFallback } from './ui/avatar';

interface MonthViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick: (event: Event) => void;
}

export function MonthView({ currentDate, events, onEventClick }: MonthViewProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();
  
  const prevMonth = new Date(year, month - 1, 0);
  const daysInPrevMonth = prevMonth.getDate();
  
  const calendarDays = [];
  
  // Previous month's trailing days
  for (let i = firstDayWeekday - 1; i >= 0; i--) {
    calendarDays.push({
      date: daysInPrevMonth - i,
      month: 'prev',
      fullDate: new Date(year, month - 1, daysInPrevMonth - i)
    });
  }
  
  // Current month's days
  for (let date = 1; date <= daysInMonth; date++) {
    calendarDays.push({
      date,
      month: 'current',
      fullDate: new Date(year, month, date)
    });
  }
  
  // Next month's leading days
  const remainingCells = 42 - calendarDays.length;
  for (let date = 1; date <= remainingCells; date++) {
    calendarDays.push({
      date,
      month: 'next',
      fullDate: new Date(year, month + 1, date)
    });
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startTime);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const formatEventTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="h-full flex flex-col p-4">
      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-1 mb-3">
        {weekDays.map((day) => (
          <div key={day} className="p-2 text-center text-sm text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 flex-1">
        {calendarDays.map((day, index) => {
          const dayEvents = getEventsForDate(day.fullDate);
          const isCurrentMonth = day.month === 'current';
          const isTodayDate = isToday(day.fullDate);
          
          return (
            <div
              key={index}
              className={`border rounded-lg p-2 min-h-[80px] flex flex-col ${
                isCurrentMonth ? 'bg-card' : 'bg-muted/30 text-muted-foreground'
              } ${isTodayDate ? 'ring-2 ring-primary' : ''}`}
            >
              <div className={`text-center text-sm mb-2 ${
                isTodayDate ? 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center mx-auto' : ''
              }`}>
                {day.date}
              </div>
              
              <div className="flex-1 space-y-1">
                {dayEvents.slice(0, 2).map((event) => (
                  <div
                    key={event.id}
                    className="w-full cursor-pointer hover:opacity-80 text-xs p-1 rounded"
                    style={{ backgroundColor: event.color + '20', color: event.color }}
                    onClick={() => onEventClick(event)}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <Avatar className="h-3 w-3 flex-shrink-0">
                        <AvatarFallback 
                          className="text-xs" 
                          style={{ backgroundColor: event.creator.color, color: 'white', fontSize: '8px' }}
                        >
                          {event.creator.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate flex-1">{event.title}</span>
                    </div>
                    <div className="text-xs opacity-75 pl-4">
                      {formatEventTime(event.startTime)}
                    </div>
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-xs text-muted-foreground text-center">
                    +{dayEvents.length - 2}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}