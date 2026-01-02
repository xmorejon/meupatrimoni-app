"use client";

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { Locale } from 'date-fns';

interface TimeAgoProps {
  date: Date;
  locale: Locale;
  translations: {
    updated: string;
  }
}

export const TimeAgo: React.FC<TimeAgoProps> = ({ date, locale, translations }) => {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    // This code only runs on the client, after hydration
    setTimeAgo(formatDistanceToNow(date, { addSuffix: false, locale }));
  }, [date, locale]);

  // Render a placeholder on the server and during initial client render
  if (!timeAgo) {
    return <div className="text-xs text-muted-foreground">...</div>;
  }

  // Render the actual time ago string once the client has mounted
  return (
    <div className="text-xs text-muted-foreground">
      {translations.updated.replace('{time}', timeAgo)}
    </div>
  );
};
