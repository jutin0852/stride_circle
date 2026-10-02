export type ScoreInput = {
  userId: string;
  verifiedSteps: number;
};

export type RankedScore = ScoreInput & {
  isWinner: boolean;
  rank: number;
};

export function rankScores(scores: ScoreInput[]): RankedScore[] {
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

export function totalVerifiedSteps(scores: ScoreInput[]) {
  return scores.reduce((total, score) => total + score.verifiedSteps, 0);
}
