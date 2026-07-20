import React from 'react';
import styles from './Card.module.css';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
    return (
        <div className={`${styles.card} ${className}`.trim()} {...props}>
            {children}
        </div>
    );
};

export const Panel: React.FC<CardProps> = ({ children, className = '', ...props }) => {
    return (
        <div className={`${styles.panel} ${className}`.trim()} {...props}>
            {children}
        </div>
    );
};
