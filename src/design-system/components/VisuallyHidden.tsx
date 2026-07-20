import React from 'react';
import styles from './VisuallyHidden.module.css';

export interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
    children: React.ReactNode;
}

export const VisuallyHidden: React.FC<VisuallyHiddenProps> = ({
    children,
    className = '',
    ...props
}) => {
    return (
        <span
            className={`${styles['visually-hidden']} ${className}`.trim()}
            {...props}
        >
            {children}
        </span>
    );
};
