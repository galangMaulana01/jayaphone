// Empty-list placeholder. Mirrors `emptyState(msg, iconName)` helper.

import { Icon } from "@/lib/icons";

interface EmptyStateProps {
  message: string;
  iconName?: string;
}

export function EmptyState({ message, iconName = "emptyInboxSvg" }: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 flex h-10 w-10 items-center justify-center text-jp-faint dark:text-jp-muted-dark">
        <Icon name={iconName} className="h-6 w-6" />
      </div>
      <p className="max-w-sm text-sm font-medium text-jp-muted dark:text-jp-muted-dark">{message}</p>
    </div>
  );
}
