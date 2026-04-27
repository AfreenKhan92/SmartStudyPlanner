import React from 'react';

export default function Button({ 
  children, 
  variant = 'primary', 
  className = '', 
  loading = false, 
  ...props 
}) {
  const baseStyles = 'btn';
  const variants = {
    primary: 'btn-primary',
    ghost:   'btn-ghost',
    danger:  'btn-danger',
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant] || variants.primary} ${className} ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
