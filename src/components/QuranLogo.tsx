import React from 'react';

interface QuranLogoProps extends React.SVGProps<SVGSVGElement> {
  variant?: 'full' | 'icon';
  size?: number | string;
  className?: string;
  lightModeStroke?: string;
  darkModeStroke?: string;
}

/**
 * Official Quran Video Studio Logo Component
 * - 'icon': Just the Quran book stand + 8-pointed star rosette + golden play button
 * - 'full': The complete logo with emblem and "QURAN VIDEO STUDIO" typography
 * Supports adaptive light & dark themes seamlessly.
 */
export const QuranLogo: React.FC<QuranLogoProps> = ({
  variant = 'icon',
  size,
  className = '',
  lightModeStroke = '#0E5E4E',
  darkModeStroke = '#10B981',
  ...props
}) => {
  if (variant === 'icon') {
    return (
      <svg
        viewBox="135 56 410 410"
        width={size || '100%'}
        height={size || '100%'}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 transition-colors ${className}`}
        {...props}
      >
        {/* Geometric Rub el Hizb 8-pointed star */}
        <polygon
          points="340,66 535,261 340,456 145,261"
          className="stroke-[#0E5E4E] dark:stroke-emerald-400"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <rect
          x="210"
          y="131"
          width="260"
          height="260"
          className="stroke-[#0E5E4E] dark:stroke-emerald-400"
          strokeWidth="6"
          strokeLinejoin="round"
        />

        {/* Rosette Petal Curves */}
        <path
          d="M486.51,242.52
          Q495,261 498.2,282.62
          Q501.4,304.24 482.57,318.34
          Q463.73,332.44 456.67,351.52
          Q449.6,370.6 436.58,388.17
          Q423.56,405.73 400.27,402.38
          Q376.97,399.02 358.49,407.51
          Q340,416 318.38,419.2
          Q296.76,422.4 282.66,403.57
          Q268.56,384.73 249.48,377.67
          Q230.4,370.6 212.84,357.58
          Q195.27,344.56 198.63,321.27
          Q201.98,297.97 193.49,279.49
          Q185,261 181.8,239.38
          Q178.6,217.76 197.44,203.66
          Q216.27,189.56 223.34,170.48
          Q230.4,151.4 243.42,133.84
          Q256.44,116.27 279.74,119.63
          Q303.03,122.98 321.52,114.49
          Q340,106 361.62,102.8
          Q383.24,99.6 397.34,118.44
          Q411.44,137.27 430.52,144.34
          Q449.6,151.4 467.17,164.42
          Q484.73,177.44 481.38,200.74
          Q478.02,224.03 486.51,242.52 Z"
          className="stroke-[#0E5E4E] dark:stroke-emerald-400"
          strokeWidth="6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Rehal (Quran stand) cross */}
        <path
          d="M215,351 L410,441"
          className="stroke-[#0E5E4E] dark:stroke-emerald-400"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M465,351 L270,441"
          className="stroke-[#0E5E4E] dark:stroke-emerald-400"
          strokeWidth="7"
          strokeLinecap="round"
        />

        {/* Open Quran Book Pages */}
        <path
          d="M215,196 Q285,166 340,226 L340,351 L215,351 Z"
          className="stroke-[#0E5E4E] dark:stroke-emerald-300"
          strokeWidth="8"
          strokeLinejoin="round"
        />
        <path
          d="M465,196 Q395,166 340,226 L340,351 L465,351 Z"
          className="stroke-[#0E5E4E] dark:stroke-emerald-300"
          strokeWidth="8"
          strokeLinejoin="round"
        />

        {/* Golden Video Play Triangle */}
        <polygon points="312,236 312,306 372,271" fill="#E8A33D" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 680 680"
      width={size || '100%'}
      height={size || '100%'}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-colors ${className}`}
      {...props}
    >
      {/* 8-pointed star */}
      <polygon
        points="340,66 535,261 340,456 145,261"
        className="stroke-[#0E5E4E] dark:stroke-emerald-400"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <rect
        x="210"
        y="131"
        width="260"
        height="260"
        className="stroke-[#0E5E4E] dark:stroke-emerald-400"
        strokeWidth="5"
        strokeLinejoin="round"
      />

      {/* Rosette curves */}
      <path
        d="M486.51,242.52
        Q495,261 498.2,282.62
        Q501.4,304.24 482.57,318.34
        Q463.73,332.44 456.67,351.52
        Q449.6,370.6 436.58,388.17
        Q423.56,405.73 400.27,402.38
        Q376.97,399.02 358.49,407.51
        Q340,416 318.38,419.2
        Q296.76,422.4 282.66,403.57
        Q268.56,384.73 249.48,377.67
        Q230.4,370.6 212.84,357.58
        Q195.27,344.56 198.63,321.27
        Q201.98,297.97 193.49,279.49
        Q185,261 181.8,239.38
        Q178.6,217.76 197.44,203.66
        Q216.27,189.56 223.34,170.48
        Q230.4,151.4 243.42,133.84
        Q256.44,116.27 279.74,119.63
        Q303.03,122.98 321.52,114.49
        Q340,106 361.62,102.8
        Q383.24,99.6 397.34,118.44
        Q411.44,137.27 430.52,144.34
        Q449.6,151.4 467.17,164.42
        Q484.73,177.44 481.38,200.74
        Q478.02,224.03 486.51,242.52 Z"
        className="stroke-[#0E5E4E] dark:stroke-emerald-400"
        strokeWidth="5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Rehal stand */}
      <path
        d="M215,351 L410,441"
        className="stroke-[#0E5E4E] dark:stroke-emerald-400"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M465,351 L270,441"
        className="stroke-[#0E5E4E] dark:stroke-emerald-400"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Open book */}
      <path
        d="M215,196 Q285,166 340,226 L340,351 L215,351 Z"
        className="stroke-[#0E5E4E] dark:stroke-emerald-300"
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <path
        d="M465,196 Q395,166 340,226 L340,351 L465,351 Z"
        className="stroke-[#0E5E4E] dark:stroke-emerald-300"
        strokeWidth="7"
        strokeLinejoin="round"
      />

      {/* Golden play triangle */}
      <polygon points="312,236 312,306 372,271" fill="#E8A33D" />

      {/* Typography */}
      <text
        x="340"
        y="566"
        textAnchor="middle"
        fontFamily="inherit"
        fontSize="46"
        fontWeight="800"
        letterSpacing="2"
        className="fill-[#0E5E4E] dark:fill-white transition-colors"
      >
        QURAN VIDEO
      </text>
      <text
        x="340"
        y="613"
        textAnchor="middle"
        fontFamily="inherit"
        fontSize="34"
        fontWeight="600"
        letterSpacing="6"
        className="fill-[#0E5E4E] dark:fill-emerald-400 transition-colors"
      >
        STUDIO
      </text>
    </svg>
  );
};

