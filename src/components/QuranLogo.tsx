import React from 'react';

export interface QuranLogoProps extends React.SVGProps<SVGSVGElement> {
  variant?: 'full' | 'icon';
  size?: number | string;
  className?: string;
}

export const QURAN_LOGO_ICON_URL = '/quran-logo-icon.png';
export const QURAN_LOGO_FULL_URL = '/quran-logo-full.png';

/**
 * Official Quran Video Logo Component
 * - 'icon': Emblem with smartphone outline, play triangle, Islamic geometric pattern, and Arabic "القرآن" calligraphy
 * - 'full': The complete brand logo with emblem, "Quran Video Maker", and "القرآن الكريم" calligraphy
 * Fully responsive and supports all standard SVG properties.
 */
export const QuranLogo: React.FC<QuranLogoProps> = ({
  variant = 'icon',
  size,
  className = '',
  ...props
}) => {
  if (variant === 'full') {
    return (
      <svg
        viewBox="0 0 1024 1024"
        width={size || '100%'}
        height={size || '100%'}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 select-none transition-transform ${className}`}
        {...props}
      >
        <title>Quran Video Maker</title>
        <image
          href="/quran-logo-full.png"
          width="1024"
          height="1024"
          preserveAspectRatio="xMidYMid meet"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 512 512"
      width={size || '100%'}
      height={size || '100%'}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none transition-transform ${className}`}
      {...props}
    >
      <title>Quran Video Maker</title>
      <image
        href="/quran-logo-icon.png"
        width="512"
        height="512"
        preserveAspectRatio="xMidYMid meet"
      />
    </svg>
  );
};

export default QuranLogo;
