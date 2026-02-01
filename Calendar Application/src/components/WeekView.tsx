import { Event } from './Calendar';
import { Avatar, AvatarFallback } from './ui/avatar';
import { useRef, useEffect } from 'react';

interface WeekViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick: (event: Event) => void;
}

export function WeekView({ currentDate, events, onEventClick }: WeekViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
  
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + index);
    return date;
  });

  // Find which day contains current date and scroll to it on mount
  useEffect(() => {
    const todayIndex = weekDays.findIndex(day => 
      day.getDate() === currentDate.getDate() &&
      day.getMonth() === currentDate.getMonth() &&
      day.getFullYear() === currentDate.getFullYear()
    );
    
    if (todayIndex !== -1 && scrollRef.current) {
      const containerWidth = scrollRef.current.offsetWidth;
      const dayWidth = containerWidth / 3; // Show 3 days at a time
      // Scroll to show current day centered or at start
      const scrollPosition = Math.max(0, dayWidth * todayIndex - dayWidth);
      scrollRef.current.scrollLeft = scrollPosition;
    }
  }, [currentDate]);

  const timeSlots = Array.from({ length: 17 }, (_, index) => {
    const hour = index + 6;
    return {
      hour,
      display: hour < 12 ? `${hour}:00 AM` : hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`
    };
  });

  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startTime);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const getEventStyle = (event: Event) => {
    const startHour = event.startTime.getHours();
    const startMinute = event.startTime.getMinutes();
    const endHour = event.endTime.getHours();
    const endMinute = event.endTime.getMinutes();
    
    const startPosition = ((startHour - 6) * 60 + startMinute) / 60;
    const duration = ((endHour - startHour) * 60 + (endMinute - startMinute)) / 60;
    
    return {
      top: `${startPosition * 60}px`,
      height: `${Math.max(duration * 60, 40)}px`,
      backgroundColor: event.color + '20',
      borderLeft: `3px solid ${event.color}`,
      color: event.color
    };
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

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="h-full flex flex-col">
      {/* Unified scrollable container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Time column - fixed */}
        <div className="w-14 flex-shrink-0 flex flex-col border-r">
          {/* Empty space for header alignment */}
          <div className="h-16 border-b bg-card"></div>
          {/* Time slots */}
          <div className="flex-1 overflow-hidden">
            <div className="bg-card/50">
              {timeSlots.map((slot) => (
                <div key={slot.hour} className="h-[60px] flex items-start justify-center text-xs text-muted-foreground pt-1">
                  {slot.hour}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable days container */}
        <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-hide">
          <div className="flex" style={{ minWidth: '300%' }}>
            {weekDays.map((date, index) => {
              const dayEvents = getEventsForDay(date);
              
              return (
                <div key={index} className="min-w-[33.333%] flex-shrink-0 flex flex-col border-r">
                  {/* Day header */}
                  <div className={`h-16 p-3 text-center border-b snap-start ${
                    isToday(date) ? 'bg-primary/10' : 'bg-card'
                  }`}>
                    <div className="text-xs text-muted-foreground mb-1">{dayNames[index]}</div>
                    <div className={`text-base font-medium ${
                      isToday(date) ? 'bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto' : ''
                    }`}>
                      {date.getDate()}
                    </div>
                  </div>
                  
                  {/* Day content with events */}
                  <div className="flex-1 relative overflow-y-auto">
                    {/* Hour lines */}
                    {timeSlots.map((slot) => (
                      <div key={slot.hour} className="h-[60px] border-b border-muted/30"></div>
                    ))}
                    
                    {/* Events */}
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        className="absolute left-2 right-2 p-2 rounded-lg cursor-pointer hover:opacity-80 shadow-sm"
                        style={getEventStyle(event)}
                        onClick={() => onEventClick(event)}
                      >
                        <div className="flex items-start gap-2 mb-1">
                          <Avatar className="h-5 w-5 flex-shrink-0">
                            <AvatarFallback 
                              className="text-[10px] font-medium" 
                              style={{ backgroundColor: event.creator.color, color: 'white' }}
                            >
                              {event.creator.avatar}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium leading-tight line-clamp-2">{event.title}</div>
                          </div>
                        </div>
                        <div className="text-xs opacity-80 font-medium">
                          {formatEventTime(event.startTime)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}