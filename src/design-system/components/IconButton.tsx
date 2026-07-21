import React, { useEffect } from 'react';
import { Button, ButtonProps } from './Button';
import { Icon, IconId } from './Icon';
import { VisuallyHidden } from './VisuallyHidden';

export interface IconButtonProps extends Omit<ButtonProps, 'children'> {
    iconId: IconId;
    'aria-label': string; // Enforce accessible label
    iconSize?: number | string;
}

export const IconButton: React.FC<IconButtonProps> = ({
    iconId,
    'aria-label': ariaLabel,
    iconSize = 20,
    className = '',
    style,
    ...props
}) => {
    useEffect(() => {
        if (!ariaLabel || ariaLabel.trim() === '') {
            console.warn('IconButton must be provided a non-empty aria-label for accessibility.');
        }
    }, [ariaLabel]);

    return (
        <Button
            className={className}
            {...props}
            style={{ padding: 'var(--spacing-2)', ...style }} // Override for icon-specific sizing if needed, or adjust in CSS
        >
            <Icon id={iconId} size={iconSize} aria-hidden="true" />
            <VisuallyHidden>{ariaLabel}</VisuallyHidden>
        </Button>
    );
};
