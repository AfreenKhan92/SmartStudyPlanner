import React from 'react';

export default function Badge({ children, variant = 'blue', className = '' }) {
  const variants = {
    blue:  'badge-blue',
    teal:  'badge-teal',
    amber: 'badge-amber',
    rose:  'badge-rose',
    green: 'badge-green',
  };

  return (
    <span className={`badge ${variants[variant] || variants.blue} ${className}`}>
      {children}
    </span>
  );
}
