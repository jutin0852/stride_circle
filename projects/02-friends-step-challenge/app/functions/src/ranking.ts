export type ScoreInput = {
  userId: string;
  verifiedSteps: number;
};

export function rankScores(scores: ScoreInput[]) {
  const ordered = [...scores].sort((first, second) => {
    if (second.verifiedSteps !== first.verifiedSteps) return second.verifiedSteps - first.verifiedSteps;
    return first.userId.localeCompare(second.userId);
  });

  return ordered.map((score, index) => {
    const previous = ordered[index - 1];
    const rank = previous && previous.verifiedSteps === score.verifiedSteps ? index : index + 1;
    return { ...score, isWinner: ordered[0]?.verifiedSteps === score.verifiedSteps, rank };
  });
}
