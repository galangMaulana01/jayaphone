"use client";

// The circular avatar in the top-right / sidebar header. Uses the migrated
// profile-photo URL allowlist (SSRF protection) to decide whether to render
// the remote image or fall back to the local SVG.

import Image from "next/image";
import { Icon } from "@/lib/icons";
import { isProfilePhotoUrlAllowed } from "@/lib/utils/profilePhotoUrl";

interface UserAvatarProps {
  fotoProfileUrl: string | null | undefined;
  altText: string;
  sizeClassName?: string;
}

export function UserAvatar({ fotoProfileUrl, altText, sizeClassName = "h-10 w-10" }: UserAvatarProps): JSX.Element {
  const isRemotePhotoSafe = fotoProfileUrl != null && isProfilePhotoUrlAllowed(fotoProfileUrl);

  if (isRemotePhotoSafe) {
    return (
      <div className={`${sizeClassName} overflow-hidden rounded-jp-sm border border-jp-border bg-jp-surface-subtle dark:border-jp-border-dark dark:bg-jp-surface-subtle-dark`}>
        <Image
          src={fotoProfileUrl as string}
          alt={altText}
          width={80}
          height={80}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return <Icon name="avatarSvg" className={`${sizeClassName} block`} ariaLabel={altText} />;
}
