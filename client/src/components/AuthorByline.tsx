import { FC } from "react";
import { Link } from "react-router-dom";
import ProfileAvatar from "./ProfileAvatar";

interface Author {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

interface AuthorBylineProps {
  primaryAuthor: Author | null;
  coAuthors?: Author[];
  showAvatars?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const AuthorByline: FC<AuthorBylineProps> = ({
  primaryAuthor,
  coAuthors = [],
  showAvatars = true,
  size = "sm",
  className = "",
}) => {
  if (!primaryAuthor) {
    return null;
  }

  const allAuthors = [primaryAuthor, ...coAuthors];
  const avatarSize = size === "sm" ? "sm" : "md";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* "By" prefix */}
      <span className="text-[var(--text-secondary)] text-sm">By</span>

      {/* Authors list */}
      <div className="flex items-center flex-wrap gap-1">
        {showAvatars && (
          <div className="flex -space-x-2 mr-1">
            {allAuthors.slice(0, 3).map((author) => (
              <Link
                key={`avatar-${author.user_id}`}
                to={`/author/${author.username}`}
                className="relative hover:z-10 transition-transform hover:scale-110"
                style={{ zIndex: allAuthors.length - allAuthors.indexOf(author) }}
                title={`@${author.username}`}
              >
                <ProfileAvatar
                  avatarUrl={author.avatar_url}
                  username={author.username}
                  size={avatarSize}
                  className="ring-2 ring-[var(--background)]"
                />
              </Link>
            ))}
            {allAuthors.length > 3 && (
              <div
                className={`flex items-center justify-center ${
                  avatarSize === "sm" ? "w-8 h-8 text-xs" : "w-12 h-12 text-sm"
                } rounded-full bg-[var(--card-bg)] border-2 border-[var(--background)] text-[var(--text-secondary)]`}
              >
                +{allAuthors.length - 3}
              </div>
            )}
          </div>
        )}

        {/* Author names as links */}
        <div className="flex items-center flex-wrap">
          {allAuthors.map((author, index) => (
            <span key={`name-${author.user_id}`} className="inline-flex items-center">
              <Link
                to={`/author/${author.username}`}
                className="text-[var(--primary)] hover:text-[var(--primary-dark)] font-medium text-sm transition-colors"
              >
                @{author.username}
              </Link>
              {index < allAuthors.length - 2 && (
                <span className="text-[var(--text-secondary)] mr-1">,</span>
              )}
              {index === allAuthors.length - 2 && (
                <span className="text-[var(--text-secondary)] mx-1">&</span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AuthorByline;
