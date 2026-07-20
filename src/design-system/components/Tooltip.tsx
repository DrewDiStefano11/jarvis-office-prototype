import React, { useId, useState, useRef, useEffect } from 'react';
import styles from './Tooltip.module.css';

export interface TooltipProps {
    content: string;
    children: React.ReactElement<any>;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
    const tooltipId = useId();
    const [isVisible, setIsVisible] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = (e: any) => {
        setIsVisible(true);
        if (children.props.onMouseEnter) children.props.onMouseEnter(e);
    };

    const handleMouseLeave = (e: any) => {
        setIsVisible(false);
        if (children.props.onMouseLeave) children.props.onMouseLeave(e);
    };

    const handleFocus = (e: any) => {
        setIsVisible(true);
        if (children.props.onFocus) children.props.onFocus(e);
    };

    const handleBlur = (e: any) => {
        setIsVisible(false);
        if (children.props.onBlur) children.props.onBlur(e);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isVisible) {
                setIsVisible(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isVisible]);

    const childDescribedBy = children.props['aria-describedby'];
    const newDescribedBy = childDescribedBy ? `${childDescribedBy} ${tooltipId}` : tooltipId;

    const clonedChild = React.cloneElement(children, {
        'aria-describedby': newDescribedBy,
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        onFocus: handleFocus,
        onBlur: handleBlur
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
