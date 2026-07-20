import React from 'react';

export type IconId = 'play' | 'pause' | 'stop' | 'warning' | 'success' | 'agent' | 'close';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
    id: IconId;
    size?: number | string;
    color?: string;
}

const IconPaths: Record<IconId, React.ReactNode> = {
    play: <path d="M8 5v14l11-7z" />,
    pause: <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />,
    stop: <path d="M6 6h12v12H6z" />,
    warning: <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />,
    success: <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />,
    agent: <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />,
    close: <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
};

export const Icon: React.FC<IconProps> = ({
    id,
    size = 24,
    color = 'currentColor',
    className = '',
    'aria-hidden': ariaHidden = true,
    ...props
}) => {
    const path = IconPaths[id];

    if (!path) {
        console.warn(`Icon placeholder ID "${id}" not found.`);
        return null;
    }

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width={size}
            height={size}
            fill={color}
            className={className}
            aria-hidden={ariaHidden}
            focusable="false"
            {...props}
        >
            {path}
        </svg>
    );
};
