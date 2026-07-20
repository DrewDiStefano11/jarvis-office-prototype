import React from 'react';
import { Badge, BadgeProps } from './Badge';
import { VisuallyHidden } from './VisuallyHidden';

export type SemanticStatus = 'idle' | 'working' | 'paused' | 'queued' | 'completed' | 'error' | 'blocked' | 'cancelled' | 'recovery-required' | 'offline';

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
    status: SemanticStatus;
    label?: string;
}

const statusLabels: Record<SemanticStatus, string> = {
    idle: 'Idle',
    working: 'Working',
    paused: 'Paused',
    queued: 'Queued',
    completed: 'Completed',
    error: 'Error',
    blocked: 'Blocked',
    cancelled: 'Cancelled',
    'recovery-required': 'Recovery Required',
    offline: 'Offline'
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    label,
    ...props
}) => {
    const displayLabel = label || statusLabels[status];
    return (
        <Badge variant={status} {...props}>
            <VisuallyHidden>Status: </VisuallyHidden>
            {displayLabel}
        </Badge>
    );
};
