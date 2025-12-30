import { FC, useState } from "react";

interface ShareButtonsProps {
  url: string;
}

const ShareButtons: FC<ShareButtonsProps> = ({ url }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-sm font-semibold text-[var(--text-primary)]">Share:</span>

      {/* Copy Link */}
      <button
        onClick={copyToClipboard}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--card-bg)] hover:bg-[var(--border)] text-[var(--text-primary)] border border-[var(--border)] transition-colors shadow-md"
        title="Copy link"
      >
        {copied ? (
          <>
            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-green-500">Copied!</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-sm">Copy Link</span>
          </>
        )}
      </button>
    </div>
  );
};

export default ShareButtons;
