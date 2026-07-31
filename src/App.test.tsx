// @vitest-environment happy-dom
import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import App from './App';

describe('App routing', () => {
    it('mounts the office engine by default', () => {
        render(<App />);

    });
});
