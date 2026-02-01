import { Event } from './Calendar';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';

interface DayViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick: (event: Event) => void;
}

export function DayView({ currentDate, events, onEventClick }: DayViewProps) {
  const timeSlots = Array.from({ length: 17 }, (_, index) => {
    const hour = index + 6;
    return {
      hour,
      display: hour < 12 ? `${hour}:00 AM` : hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`
    };
  });

  const dayEvents = events.filter(event => {
    const eventDate = new Date(event.startTime);
    return (
      eventDate.getDate() === currentDate.getDate() &&
      eventDate.getMonth() === currentDate.getMonth() &&
      eventDate.getFullYear() === currentDate.getFullYear()
    );
  });

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
      borderLeft: `4px solid ${event.color}`,
      color: event.color
    };
  };

  const getCurrentTimePosition = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    if (currentHour < 6 || currentHour > 22) return null;
    
    const position = ((currentHour - 6) * 60 + currentMinute) / 60;
    return `${position * 60}px`;
  };

  const currentTimePosition = getCurrentTimePosition();

  return (
    <div className="h-full flex flex-col">
      {/* Day header */}
      <div className="p-4 border-b bg-card">
        <h2 className="text-lg">
          {currentDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })}
        </h2>
        <p className="text-sm text-muted-foreground">
          {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Day schedule */}
      <ScrollArea className="flex-1">
        <div className="flex relative">
          {/* Time column */}
          <div className="w-16 flex-shrink-0 p-2">
            {timeSlots.map((slot) => (
              <div key={slot.hour} className="h-[60px] flex items-start justify-end text-xs text-muted-foreground">
                {slot.display}
              </div>
            ))}
          </div>

          {/* Events column */}
          <div className="flex-1 relative border-l mx-2">
            {/* Hour lines */}
            {timeSlots.map((slot) => (
              <div key={slot.hour} className="h-[60px] border-b border-muted/30"></div>
            ))}
            
            {/* Current time indicator */}
            {currentTimePosition && (
              <div
                className="absolute left-0 right-0 border-t-2 border-red-500 z-20"
                style={{ top: currentTimePosition }}
              >
                <div className="w-2 h-2 bg-red-500 rounded-full -mt-1 -ml-1"></div>
              </div>
            )}
            
            {/* Events */}
            {dayEvents.map((event) => (
              <div
                key={event.id}
                className="absolute left-1 right-1 p-3 rounded-lg cursor-pointer hover:opacity-80 z-10"
                style={getEventStyle(event)}
                onClick={() => onEventClick(event)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Avatar className="h-5 w-5 flex-shrink-0">
                    <AvatarFallback 
                      className="text-xs" 
                      style={{ backgroundColor: event.creator.color, color: 'white' }}
                    >
                      {event.creator.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-sm truncate flex-1">{event.title}</div>
                </div>
                <div className="text-xs opacity-75">
                  {event.startTime.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </div>
              </div>
            ))}
            
            {/* Empty state */}
            {dayEvents.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <p className="text-sm">No events today</p>
                  <p className="text-xs">Enjoy your free time!</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}