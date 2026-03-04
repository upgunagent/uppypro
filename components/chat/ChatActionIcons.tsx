import React from 'react';

const sharedDefs = (
    <defs>
        {/* Base 3D Body Gradient */}
        <linearGradient id="iconBase" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffc570" />
            <stop offset="30%" stopColor="#ff9500" />
            <stop offset="80%" stopColor="#e35d00" />
            <stop offset="100%" stopColor="#a63600" />
        </linearGradient>

        {/* Bright inner highlight top */}
        <linearGradient id="innerHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="15%" stopColor="#ffffff" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="80%" stopColor="#000000" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
        </linearGradient>

        {/* Secondary gradient for overlapping elements like the plus button */}
        <linearGradient id="iconLighter" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffda99" />
            <stop offset="50%" stopColor="#ffaa33" />
            <stop offset="100%" stopColor="#d96600" />
        </linearGradient>

        <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#802b00" floodOpacity="0.6" />
        </filter>

        <filter id="iconGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#8a2e00" floodOpacity="0.5" />
            <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur1" />
            <feOffset dy="1.5" dx="0" />
            <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowDiff1" />
            <feFlood floodColor="#ffffff" floodOpacity="0.9" />
            <feComposite in2="shadowDiff1" operator="in" result="highlight1" />

            <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur2" />
            <feOffset dy="-1.5" dx="0" />
            <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowDiff2" />
            <feFlood floodColor="#4a1800" floodOpacity="0.6" />
            <feComposite in2="shadowDiff2" operator="in" result="highlight2" />

            <feMerge>
                <feMergeNode in="SourceGraphic" />
                <feMergeNode in="highlight1" />
                <feMergeNode in="highlight2" />
            </feMerge>
        </filter>
    </defs>
);

export const IconAttachment = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
        {sharedDefs}
        <g transform="rotate(45 32 32)">
            {/* Outer Loop - Made thinner */}
            <rect x="22" y="8" width="20" height="48" rx="10" fill="none" stroke="url(#iconBase)" strokeWidth="6" filter="url(#dropShadow)" />
            <rect x="22" y="8" width="20" height="48" rx="10" fill="none" stroke="url(#innerHighlight)" strokeWidth="6" />
            <rect x="22" y="8" width="20" height="48" rx="10" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.6" />

            {/* Inner Loop - Made thinner */}
            <rect x="28" y="20" width="8" height="26" rx="4" fill="none" stroke="url(#iconBase)" strokeWidth="4" filter="url(#dropShadow)" />
            <rect x="28" y="20" width="8" height="26" rx="4" fill="none" stroke="url(#innerHighlight)" strokeWidth="4" />
            <rect x="28" y="20" width="8" height="26" rx="4" fill="none" stroke="#ffffff" strokeWidth="0.8" opacity="0.6" />
        </g>
    </svg>
);

export const IconWhatsappTemplate = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
        {sharedDefs}
        <g filter="url(#iconGlow)">
            {/* Document Body */}
            <path d="M14 8 C14 5.8 15.8 4 18 4 L38 4 L52 18 L52 56 C52 58.2 50.2 60 48 60 L18 60 C15.8 60 14 58.2 14 56 Z" fill="url(#iconBase)" />
            {/* Folded Corner Highlight */}
            <path d="M38 4 L38 18 L52 18 Z" fill="#ffd180" opacity="0.8" />
            <path d="M38 4 L38 18 L52 18 Z" fill="url(#innerHighlight)" />
            <path d="M14 8 C14 5.8 15.8 4 18 4 L38 4 L52 18 L52 56 C52 58.2 50.2 60 48 60 L18 60 C15.8 60 14 58.2 14 56 Z" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />

            {/* Original WA Path - Centered and Larger (moved down slightly since text is gone) */}
            <g transform="translate(1.5, 5) scale(1.1)">
                <path d="M40.1 21.6C37.9 19.3 34.8 18.1 31.6 18.1C25 18.1 19.6 23.5 19.6 30.1C19.6 32.2 20.1 34.2 21.2 36L19 44.1L27.3 41.9C29.1 42.9 31.1 43.4 33.2 43.5h0C39.8 43.5 45.2 38.1 45.2 31.5C45.2 28.3 43.9 25.3 41.6 23" fill="#ffffff" />
                <path d="M32.4 41.3h-0.2c-1.8 0-3.6-0.5-5.1-1.4l-0.4-0.2L23 40.7l1.1-3.6l-0.3-0.4c-1-1.6-1.5-3.5-1.5-5.4c0-5.5 4.5-10 10-10C35.1 21.3 37.6 22.3 39.5 24.2C41.4 26.1 42.4 28.7 42.4 31.4C42.4 36.9 37.9 41.3 32.4 41.3Z" fill="url(#iconBase)" />
                <path d="M37.9 33.8c-0.3-0.1-1.8-0.9-2.1-1c-0.3-0.1-0.5-0.1-0.7 0.1c-0.2 0.3-0.8 1-1 1.2c-0.2 0.2-0.4 0.2-0.7 0.1c-0.3-0.1-1.3-0.5-2.5-1.5c-0.9-0.8-1.5-1.8-1.7-2.1c-0.2-0.3 0-0.4 0.1-0.6c0.1-0.1 0.3-0.3 0.4-0.5C30 29.4 30 29.2 30 29s-0.1-0.5-0.3-1.2C29.4 27.2 29.2 27.4 29 27.4c-0.2 0-0.4 0-0.6 0c-0.2 0-0.5 0.1-0.8 0.4s-1 1-1 2.4c0 1.4 1 2.8 1.2 3c0.2 0.2 2 3.1 4.9 4.3c0.7 0.3 1.2 0.5 1.6 0.6c0.7 0.2 1.3 0.2 1.8 0.1c0.6-0.1 1.8-0.7 2.1-1.4s0.3-1.3 0.2-1.4C38.3 34.2 38.1 34 37.9 33.8z" fill="#ffffff" />
            </g>
        </g>
    </svg>
);

export const IconLocation = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
        {sharedDefs}
        {/* Shadow base oval */}
        <ellipse cx="32" cy="56" rx="20" ry="6" fill="url(#iconBase)" filter="url(#iconGlow)" />
        <ellipse cx="32" cy="56" rx="20" ry="6" fill="#ffffff" opacity="0.4" />
        <ellipse cx="32" cy="56" rx="20" ry="6" fill="url(#innerHighlight)" />

        {/* Pin shape */}
        <g filter="url(#iconGlow)">
            <path d="M32 6 C18 6 10 16 10 26 C10 40 32 54 32 54 C32 54 54 40 54 26 C54 16 46 6 32 6 Z" fill="url(#iconBase)" />
            <path d="M32 6 C18 6 10 16 10 26 C10 40 32 54 32 54 C32 54 54 40 54 26 C54 16 46 6 32 6 Z" fill="url(#innerHighlight)" />
            <path d="M32 6 C18 6 10 16 10 26 C10 40 32 54 32 54 C32 54 54 40 54 26 C54 16 46 6 32 6 Z" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.7" />
            <circle cx="32" cy="26" r="10" fill="url(#iconBase)" />
            <circle cx="32" cy="26" r="10" fill="#ffffff" opacity="0.5" />
            <circle cx="32" cy="26" r="10" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.8" />
        </g>
    </svg>
);

export const IconEmoji = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
        {sharedDefs}
        <g filter="url(#iconGlow)">
            <circle cx="32" cy="32" r="26" fill="url(#iconBase)" />
            <circle cx="32" cy="32" r="26" fill="url(#innerHighlight)" />
            {/* Outer Rim */}
            <circle cx="32" cy="32" r="23" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.7" />

            {/* Eyes */}
            <circle cx="21" cy="24" r="3.5" fill="#ffffff" />
            <circle cx="43" cy="24" r="3.5" fill="#ffffff" />

            {/* Smile */}
            <path d="M18 36 Q 32 50 46 36" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        </g>
    </svg>
);

export const IconQuickReply = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
        {sharedDefs}
        <g filter="url(#iconGlow)">
            {/* Back document */}
            <rect x="8" y="10" width="36" height="42" rx="4" fill="url(#iconBase)" opacity="0.8" />
            <rect x="8" y="10" width="36" height="42" rx="4" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.4" />

            {/* Front document */}
            <rect x="18" y="6" width="36" height="46" rx="4" fill="url(#iconBase)" />
            <rect x="18" y="6" width="36" height="46" rx="4" fill="url(#innerHighlight)" />
            <rect x="18" y="6" width="36" height="46" rx="4" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />

            {/* Lines */}
            <rect x="25" y="18" width="22" height="4" rx="2" fill="#ffffff" opacity="0.9" />
            <rect x="25" y="28" width="22" height="4" rx="2" fill="#ffffff" opacity="0.9" />
            <rect x="25" y="38" width="14" height="4" rx="2" fill="#ffffff" opacity="0.9" />
        </g>

        {/* Plus Badge */}
        <g filter="url(#iconGlow)">
            <circle cx="48" cy="46" r="12" fill="url(#iconLighter)" />
            <circle cx="48" cy="46" r="12" fill="url(#innerHighlight)" />
            <circle cx="48" cy="46" r="12" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.8" />

            {/* Plus */}
            <path d="M48 38 L48 54 M40 46 L56 46" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        </g>
    </svg>
);

export const IconMicrophone = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
        {sharedDefs}
        <g filter="url(#iconGlow)">
            {/* Microphone Body */}
            <rect x="24" y="6" width="16" height="28" rx="8" fill="url(#iconBase)" />
            <rect x="24" y="6" width="16" height="28" rx="8" fill="url(#innerHighlight)" />
            <rect x="24" y="6" width="16" height="28" rx="8" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.7" />

            {/* Microphone base cup */}
            <path d="M16 26 C16 40 22 42 32 42 C42 42 48 40 48 26" fill="none" stroke="url(#iconBase)" strokeWidth="4" strokeLinecap="round" />
            <path d="M16 26 C16 40 22 42 32 42 C42 42 48 40 48 26" fill="none" stroke="url(#innerHighlight)" strokeWidth="4" strokeLinecap="round" />
            <path d="M16 26 C16 40 22 42 32 42 C42 42 48 40 48 26" fill="none" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.5" />

            {/* Stand Line */}
            <line x1="32" y1="42" x2="32" y2="54" stroke="url(#iconBase)" strokeWidth="4" strokeLinecap="round" />
            <line x1="32" y1="42" x2="32" y2="54" stroke="url(#innerHighlight)" strokeWidth="4" strokeLinecap="round" />

            {/* Stand Base */}
            <line x1="20" y1="54" x2="44" y2="54" stroke="url(#iconBase)" strokeWidth="4" strokeLinecap="round" />
            <line x1="20" y1="54" x2="44" y2="54" stroke="url(#innerHighlight)" strokeWidth="4" strokeLinecap="round" />
            <line x1="20" y1="54" x2="44" y2="54" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
        </g>
    </svg>
);
