export type TrustpilotReview = {
  id: string;
  stars: number;
  title: string;
  text: string;
  createdAt: string;
  consumer: {
    displayName: string;
  };
};

export type TrustpilotSummary = {
  score: number;
  numberOfReviews: number;
  stars: number; // 1-5 rounded
};
