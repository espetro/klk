import { cn } from './utils';
import { cva } from 'class-variance-authority';

export { buttonVariants, buttonTextVariants } from '../components/rnr/button';

export const cardVariants = cva(
  cn('bg-card border-border flex flex-col gap-6 rounded-xl border py-6 shadow-sm shadow-black/5'),
  {
    variants: {
      variant: {
        default: '',
        elevated: 'shadow-md shadow-black/10',
        ghost: 'bg-transparent border-transparent shadow-none',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export { toggleVariants } from '../components/rnr/toggle';

export const inputVariants = cva(
  cn(
    'dark:bg-input/30 border-input bg-background text-foreground flex h-10 w-full min-w-0 flex-row items-center rounded-md border px-3 py-1 text-base leading-5 shadow-sm shadow-black/5 sm:h-9'
  ),
  {
    variants: {
      variant: {
        default: '',
        error: 'border-destructive/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export { textVariants } from '../components/rnr/text';
export { TextClassContext } from '../components/rnr/text';
