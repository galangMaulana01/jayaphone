// Empty-list placeholder. Mirrors `emptyState(msg, iconName)` helper.

import { Icon } from "@/lib/icons";

interface EmptyStateProps {
  message: string;
  iconName?: string;
}

export function EmptyState({ message, iconName = "emptyInboxSvg" }: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400 dark:bg-zinc-800/50 dark:text-zinc-500">
        <Icon name={iconName} className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500">{message}</p>
    </div>
  );
}
