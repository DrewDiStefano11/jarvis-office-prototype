import React, { useId, useState, useRef, ReactElement } from 'react';
import styles from './Tooltip.module.css';

export interface TooltipProps {
    content: string;
    children: ReactElement<React.HTMLAttributes<HTMLElement>>;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
    const tooltipId = useId();
    const [isVisible, setIsVisible] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
        setIsVisible(true);
        if (children.props.onMouseEnter) children.props.onMouseEnter(e);
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
        setIsVisible(false);
        if (children.props.onMouseLeave) children.props.onMouseLeave(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLElement>) => {
        setIsVisible(true);
        if (children.props.onFocus) children.props.onFocus(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
        setIsVisible(false);
        if (children.props.onBlur) children.props.onBlur(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Escape' && isVisible) {
            setIsVisible(false);
        }
        if (children.props.onKeyDown) children.props.onKeyDown(e);
    };

    const childDescribedBy = children.props['aria-describedby'];
    const newDescribedBy = childDescribedBy ? `${childDescribedBy} ${tooltipId}` : tooltipId;

    const clonedChild = React.cloneElement(children, {
        'aria-describedby': newDescribedBy,
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        onFocus: handleFocus,
        onBlur: handleBlur,
        onKeyDown: handleKeyDown
    });

    return (
        <div className={styles.tooltipContainer} ref={containerRef}>
            {clonedChild}
            <div
                id={tooltipId}
                className={styles.tooltipContent}
                role="tooltip"
                style={{ opacity: isVisible ? 1 : 0, visibility: isVisible ? 'visible' : 'hidden' }}
            >
                {content}
            </div>
        </div>
    );
};
