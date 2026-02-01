import { useState } from 'react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, List, Plus } from 'lucide-react';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { EventSheet } from './EventSheet';
import { AddEventSheet } from './AddEventSheet';

export interface EventCreator {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

export interface Participant {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  type: 'meeting' | 'reminder' | 'event' | 'task';
  color: string;
  creator: EventCreator;
  isGroupEvent: boolean;
  participants: Participant[];
  recurrence?: {
    type: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
  };
}

// Sample creators
const creators: EventCreator[] = [
  { id: '1', name: 'John Doe', avatar: 'JD', color: '#3b82f6' },
  { id: '2', name: 'Sarah Wilson', avatar: 'SW', color: '#10b981' },
  { id: '3', name: 'Mike Chen', avatar: 'MC', color: '#f59e0b' },
  { id: '4', name: 'You', avatar: 'Y', color: '#8b5cf6' }
];

// Sample participants
const participants: Participant[] = [
  { id: 'p1', name: 'Леня', avatar: 'Л', color: '#ef4444' },
  { id: 'p2', name: 'Таня', avatar: 'Т', color: '#10b981' },
  { id: 'p3', name: 'Яся', avatar: 'Я', color: '#f59e0b' }
];

// Sample event data with creators
const initialEvents: Event[] = [
  {
    id: '1',
    title: 'Team Meeting',
    description: 'Weekly team sync to discuss project progress and upcoming deadlines.',
    startTime: new Date(2025, 6, 16, 10, 0),
    endTime: new Date(2025, 6, 16, 11, 0),
    type: 'meeting',
    color: '#3b82f6',
    creator: creators[0],
    isGroupEvent: true,
    participants: [participants[0], participants[1]],
    recurrence: {
      type: 'weekly',
      interval: 1
    }
  },
  {
    id: '2',
    title: 'Project Deadline',
    description: 'Final submission for the Q3 project deliverables.',
    startTime: new Date(2025, 6, 18, 17, 0),
    endTime: new Date(2025, 6, 18, 18, 0),
    type: 'reminder',
    color: '#ef4444',
    creator: creators[3],
    isGroupEvent: false,
    participants: [],
    recurrence: {
      type: 'none',
      interval: 1
    }
  },
  {
    id: '3',
    title: 'Client Presentation',
    description: 'Present the new features and get feedback from the client.',
    startTime: new Date(2025, 6, 17, 14, 0),
    endTime: new Date(2025, 6, 17, 15, 30),
    type: 'meeting',
    color: '#10b981',
    creator: creators[1],
    isGroupEvent: true,
    participants: [participants[0], participants[2]],
    recurrence: {
      type: 'none',
      interval: 1
    }
  },
  {
    id: '4',
    title: 'Code Review',
    description: 'Review pull requests and provide feedback to team members.',
    startTime: new Date(2025, 6, 15, 9, 0),
    endTime: new Date(2025, 6, 15, 10, 0),
    type: 'task',
    color: '#8b5cf6',
    creator: creators[3],
    isGroupEvent: false,
    participants: [participants[1]],
    recurrence: {
      type: 'daily',
      interval: 1
    }
  },
  {
    id: '5',
    title: 'Lunch with Sarah',
    description: 'Catch up over lunch at the new restaurant downtown.',
    startTime: new Date(2025, 6, 19, 12, 30),
    endTime: new Date(2025, 6, 19, 13, 30),
    type: 'event',
    color: '#f59e0b',
    creator: creators[2],
    isGroupEvent: false,
    participants: [participants[2]],
    recurrence: {
      type: 'none',
      interval: 1
    }
  },
  {
    id: '6',
    title: 'Gym Session',
    description: 'Regular workout session at the gym.',
    startTime: new Date(2025, 6, 15, 18, 0),
    endTime: new Date(2025, 6, 15, 19, 30),
    type: 'event',
    color: '#06b6d4',
    creator: creators[3],
    isGroupEvent: false,
    participants: [],
    recurrence: {
      type: 'none',
      interval: 1
    }
  }
];

export function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 6, 15));
  const [currentView, setCurrentView] = useState<'week' | 'day'>('week');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEventSheetOpen, setIsEventSheetOpen] = useState(false);
  const [isAddEventSheetOpen, setIsAddEventSheetOpen] = useState(false);
  const [events, setEvents] = useState<Event[]>(initialEvents);

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setIsEventSheetOpen(true);
  };

  const handleAddEvent = (newEvent: Omit<Event, 'id' | 'creator'>) => {
    const event: Event = {
      ...newEvent,
      id: Date.now().toString(),
      creator: creators[3] // Default to "You"
    };
    setEvents([...events, event]);
    setIsAddEventSheetOpen(false);
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    switch (currentView) {
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
    }
    
    setCurrentDate(newDate);
  };

  const getDateRangeText = () => {
    switch (currentView) {
      case 'week':
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      case 'day':
        return currentDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        });
      default:
        return '';
    }
  };

  const handleTodayClick = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="h-screen flex flex-col bg-background relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate('prev')}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate('next')}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg leading-none">{getDateRangeText()}</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTodayClick}
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
            >
              Today
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-hidden">
        {currentView === 'week' && (
          <WeekView 
            currentDate={currentDate} 
            events={events} 
            onEventClick={handleEventClick}
          />
        )}
        {currentView === 'day' && (
          <DayView 
            currentDate={currentDate} 
            events={events} 
            onEventClick={handleEventClick}
          />
        )}
      </div>

      {/* Add Event FAB */}
      <Button
        onClick={() => setIsAddEventSheetOpen(true)}
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-20"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Bottom Navigation */}
      <div className="border-t bg-card">
        <div className="flex">
          <Button
            variant={currentView === 'week' ? 'default' : 'ghost'}
            className="flex-1 flex flex-col gap-1 h-16 rounded-none"
            onClick={() => setCurrentView('week')}
          >
            <List className="h-5 w-5" />
            <span className="text-xs">Week</span>
          </Button>
          <Button
            variant={currentView === 'day' ? 'default' : 'ghost'}
            className="flex-1 flex flex-col gap-1 h-16 rounded-none"
            onClick={() => setCurrentView('day')}
          >
            <Clock className="h-5 w-5" />
            <span className="text-xs">Day</span>
          </Button>
        </div>
      </div>

      {/* Event Sheet */}
      <EventSheet
        event={selectedEvent}
        open={isEventSheetOpen}
        onOpenChange={setIsEventSheetOpen}
      />

      {/* Add Event Sheet */}
      <AddEventSheet
        open={isAddEventSheetOpen}
        onOpenChange={setIsAddEventSheetOpen}
        onAddEvent={handleAddEvent}
        defaultDate={currentDate}
      />
    </div>
  );
}