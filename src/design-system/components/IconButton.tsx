import React from 'react';
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
    ...props
}) => {
    return (
        <Button
            className={className}
            {...props}
            style={{ padding: 'var(--spacing-2)' }} // Override for icon-specific sizing if needed, or adjust in CSS
        >
            <Icon id={iconId} size={iconSize} />
            <VisuallyHidden>{ariaLabel}</VisuallyHidden>
        </Button>
    );
};
