import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white p-6 sm:p-8 rounded-xl shadow-md ${className}`}>
      {children}
    </div>
  );
};

export default Card;
