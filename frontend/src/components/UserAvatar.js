import React from 'react';
import { cn } from '../lib/utils';

const UserAvatar = ({ name, imageUrl, className }) => {
  const label = (name || '?').trim().charAt(0).toUpperCase() || '?';

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name || 'User avatar'}
        className={cn('rounded-full object-cover', className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#60A5FA] font-semibold text-white',
        className
      )}
      aria-label={name || 'User avatar'}
      title={name || ''}
    >
      {label}
    </div>
  );
};

export default UserAvatar;
