import React from 'react';

export default function Card({ children, className = '', hoverable = false, ...props }) {
  return (
    <div 
      className={`${hoverable ? 'card-hover' : 'card'} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
