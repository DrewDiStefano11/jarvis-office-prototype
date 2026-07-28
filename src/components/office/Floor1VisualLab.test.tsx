// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Floor1VisualLab } from './Floor1VisualLab';

describe('Floor1VisualLab', () => {
    afterEach(cleanup);
    beforeEach(() => {
        Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:registration') });
        Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    });

    it('renders candidate overlays and layer toggles control visibility', () => {
        render(<Floor1VisualLab mode="registration" />);
        expect(screen.getByTestId('layer-rooms')).toBeTruthy();
        fireEvent.click(screen.getByLabelText('Show rooms'));
        expect(screen.queryByTestId('layer-rooms')).toBeNull();
        expect(screen.getByText('Registration alignment mode')).toBeTruthy();
    });

    it('edits landmarks, applies the fit, and exports fitted values', async () => {
        render(<Floor1VisualLab mode="registration" />);
        fireEvent.click(screen.getByText('Add landmark'));
        fireEvent.click(screen.getByText('Add landmark'));
        fireEvent.change(screen.getByLabelText('landmark-1 embedded x'), { target: { value: '0' } });
        fireEvent.change(screen.getByLabelText('landmark-1 embedded y'), { target: { value: '0' } });
        fireEvent.change(screen.getByLabelText('landmark-1 production x'), { target: { value: '10' } });
        fireEvent.change(screen.getByLabelText('landmark-1 production y'), { target: { value: '20' } });
        fireEvent.change(screen.getByLabelText('landmark-2 embedded x'), { target: { value: '100' } });
        fireEvent.change(screen.getByLabelText('landmark-2 embedded y'), { target: { value: '0' } });
        fireEvent.change(screen.getByLabelText('landmark-2 production x'), { target: { value: '210' } });
        fireEvent.change(screen.getByLabelText('landmark-2 production y'), { target: { value: '20' } });
        fireEvent.click(screen.getByText('Apply fitted registration'));
        expect((screen.getByLabelText('scale') as HTMLInputElement).value).toBe('2');
        fireEvent.click(screen.getByText('Export fitted candidate'));
        const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob;
        const exported = JSON.parse(await blob.text());
        expect(exported.transform).toEqual({ scale: 2, offsetX: 10, offsetY: 20 });
        expect(exported.approved).toBe(false);
    });

    it('shows a controlled malformed-import error', async () => {
        render(<Floor1VisualLab mode="provisional" />);
        const input = screen.getByLabelText('Import registration JSON');
        fireEvent.change(input, { target: { files: [new File(['not-json'], 'broken.json', { type: 'application/json' })] } });
        await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Unexpected|JSON/));
        expect(screen.getByText('Provisional geometry mode')).toBeTruthy();
    });
});
