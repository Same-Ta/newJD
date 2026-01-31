import React from 'react';

interface BadgeProps {
  type: string;
  text: string;
}

export const Badge = ({ type, text }: BadgeProps) => {
  let styleClass = '';
  switch(type) {
    case '채용중': styleClass = 'bg-blue-600 text-white'; break;
    case '공고': styleClass = 'bg-purple-600 text-white'; break;
    case '검토가능': styleClass = 'bg-gray-500 text-white'; break;
    case '마감임박': styleClass = 'bg-red-500 text-white'; break;
    default: styleClass = 'bg-gray-800 text-white';
  }
  
  return (
    <span className={`px-2.5 py-1 rounded-[4px] text-[11px] font-bold tracking-wide ${styleClass}`}>
      {text}
    </span>
  );
};
