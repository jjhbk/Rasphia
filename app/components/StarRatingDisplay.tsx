
import React from 'react';
import StarIcon from './icons/StarIcon';

interface StarRatingDisplayProps {
  rating: number;
  maxStars?: number;
}

const StarRatingDisplay: React.FC<StarRatingDisplayProps> = ({ rating, maxStars = 5 }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  const emptyStars = maxStars - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center">
      {[...Array(fullStars)].map((_, i) => (
        <StarIcon key={`full-${i}`} className="w-4 h-4 text-yellow-400" filled={true} />
      ))}
      {/* Note: Half-star logic can be added here if a half-star icon is available */}
      {[...Array(emptyStars)].map((_, i) => (
        <StarIcon key={`empty-${i}`} className="w-4 h-4 text-stone-300" filled={false} />
      ))}
    </div>
  );
};

export default StarRatingDisplay;
