import React from 'react';
import styles from './Badge.module.css';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'idle' | 'working' | 'paused' | 'queued' | 'completed' | 'error' | 'blocked' | 'cancelled' | 'recovery-required' | 'offline';
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'default',
    className = '',
    ...props
}) => {
    const classNames = [
        styles.badge,
        styles[variant],
        className
    ].filter(Boolean).join(' ');

    return (
        <span className={classNames} {...props}>
            {children}
        </span>
    );
};
