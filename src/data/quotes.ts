export interface DailyQuote {
  text: string;
  author: string;
}

const DAILY_QUOTES: DailyQuote[] = [
  {
    text: 'Small, consistent actions each day build the life you want to live.',
    author: 'OneSpace Daily',
  },
  {
    text: 'Clarity comes from engagement, not thought alone.',
    author: 'Marie Forleo',
  },
  {
    text: 'Order in your workspace creates calm in your mind.',
    author: 'OneSpace Daily',
  },
  {
    text: 'You do not rise to the level of your goals; you fall to the level of your systems.',
    author: 'James Clear',
  },
  {
    text: 'Focus on being productive instead of busy.',
    author: 'Tim Ferriss',
  },
  {
    text: 'The secret of getting ahead is getting started.',
    author: 'Mark Twain',
  },
  {
    text: 'Discipline is choosing between what you want now and what you want most.',
    author: 'Abraham Lincoln',
  },
  {
    text: 'Guard your attention—it is the most valuable currency you own.',
    author: 'OneSpace Daily',
  },
  {
    text: 'What gets measured and reviewed gets improved.',
    author: 'Peter Drucker',
  },
  {
    text: 'Simplicity is about subtracting the obvious and adding the meaningful.',
    author: 'John Maeda',
  },
  {
    text: 'Do what you can, with what you have, where you are.',
    author: 'Theodore Roosevelt',
  },
  {
    text: 'Action is the foundational key to all success.',
    author: 'Pablo Picasso',
  },
  {
    text: 'Progress is rarely a straight line, but daily effort compounds.',
    author: 'OneSpace Daily',
  },
  {
    text: 'A goal without a timeline and milestones is just a wish.',
    author: 'OneSpace Daily',
  },
  {
    text: 'Your future is created by what you do today, not tomorrow.',
    author: 'Robert Kiyosaki',
  },
  {
    text: 'Rest when you need to, review what matters, and keep moving forward.',
    author: 'OneSpace Daily',
  },
];

export function getDailyQuote(date: Date = new Date()): DailyQuote {
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}
