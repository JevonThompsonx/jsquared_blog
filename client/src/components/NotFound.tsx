import { FC } from "react";
import { Link } from "react-router-dom";
import SEO from "./SEO";

const NotFound: FC = () => {
  return (
    <>
      <SEO
        title="Page Not Found"
        description="This page doesn't exist. Return to J²Adventures to continue exploring."
      />
      <div
        className="min-h-screen flex items-center justify-center px-4 pt-24"
        style={{ background: "var(--background)" }}
      >
        <div className="text-center max-w-2xl">
          {/* Lost compass illustration */}
          <div className="mb-8 flex justify-center">
            <svg
              className="w-32 h-32 text-[var(--primary)] opacity-80"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          </div>

          {/* 404 Message */}
          <h1 className="text-6xl md:text-8xl font-bold text-[var(--text-primary)] mb-4">
            404
          </h1>
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary)] mb-6">
            Oops! You adventured into the wrong page!
          </h2>
          <p className="text-lg text-[var(--text-secondary)] mb-8">
            Looks like you've wandered off the trail. Don't worry though—even the
            best explorers get lost sometimes. Let's get you back on track!
          </p>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white font-semibold py-3 px-8 rounded-lg transition-all shadow-lg hover:shadow-xl"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Back to Home
            </Link>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center gap-2 bg-[var(--card-bg)] hover:bg-[var(--border)] text-[var(--text-primary)] font-semibold py-3 px-8 rounded-lg transition-all border border-[var(--border)] shadow-md hover:shadow-lg"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Go Back
            </button>
          </div>

          {/* Fun quote */}
          <p className="mt-12 text-sm text-[var(--text-secondary)] italic">
            "Not all those who wander are lost... but this page definitely is."
          </p>
        </div>
      </div>
    </>
  );
};

export default NotFound;
