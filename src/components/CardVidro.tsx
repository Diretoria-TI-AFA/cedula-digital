import React from 'react';

interface CardVidroProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  onClick?: () => void;
}

const CardVidro: React.FC<CardVidroProps> = ({ children, className = '', hoverEffect = false, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        bg-white/10 
        backdrop-blur-md 
        border border-white/20 
        shadow-lg 
        rounded-2xl 
        p-6 
        transition-all 
        duration-300
        ${hoverEffect ? 'hover:bg-white/15 hover:scale-[1.01] hover:shadow-xl cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default CardVidro;
