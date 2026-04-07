export function resolveCommentMutationComments<T>(currentComments: T[], nextComments?: T[]): {
  comments: T[];
  shouldRefetch: boolean;
} {
  if (nextComments) {
    return { comments: nextComments, shouldRefetch: false };
  }

  return { comments: currentComments, shouldRefetch: true };
}
