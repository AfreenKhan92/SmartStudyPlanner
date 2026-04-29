import React, { forwardRef } from 'react';

const Input = forwardRef(({ label, className = '', containerClassName = '', error, ...props }, ref) => {
  return (
    <div className={`w-full ${containerClassName}`}>
      {label && <label className="input-label">{label}</label>}
      <input 
        ref={ref}
        className={`input ${error ? 'border-rose focus:border-rose focus:ring-rose/10' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-rose">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
