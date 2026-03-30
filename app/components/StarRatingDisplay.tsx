import React from "react";
import StarIcon from "./icons/StarIcon";

interface StarRatingDisplayProps {
  rating: number;
  maxStars?: number;
}

const StarRatingDisplay: React.FC<StarRatingDisplayProps> = ({
  rating,
  maxStars = 5,
}) => {
  const fullStars = Math.floor(rating);
  const emptyStars = maxStars - fullStars;

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(fullStars)].map((_, i) => (
        <StarIcon key={`full-${i}`} className="w-3.5 h-3.5 text-brand-mustard" filled={true} />
      ))}
      {[...Array(emptyStars)].map((_, i) => (
        <StarIcon key={`empty-${i}`} className="w-3.5 h-3.5 text-brand-sand" filled={false} />
      ))}
    </div>
  );
};

export default StarRatingDisplay;
