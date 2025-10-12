/**
 * Tests para DayScheduleEditor
 * 
 * Verifica funcionalidad de configuración de horarios por día
 * con validaciones robustas y UX optimizada.
 * 
 * @author Sistema Polideportivo
 * @version 1.0.0
 * @since 2025-01-09
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DayScheduleEditor, { DaySchedule, TimeSlot } from '../DayScheduleEditor';

describe('DayScheduleEditor', () => {
  const mockOnChange = jest.fn();
  const defaultSchedule: DaySchedule = {
    closed: false,
    slots: [{ start: '09:00', end: '17:00' }]
  };

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('debe renderizar correctamente con horario por defecto', () => {
    render(
      <DayScheduleEditor
        dayName="Lunes"
        dayKey="monday"
        schedule={defaultSchedule}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Lunes')).toBeInTheDocument();
    expect(screen.getByText('Franja 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('09:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('17:00')).toBeInTheDocument();
  });

  it('debe permitir marcar el día como cerrado', async () => {
    render(
      <DayScheduleEditor
        dayName="Lunes"
        dayKey="monday"
        schedule={defaultSchedule}
        onChange={mockOnChange}
      />
    );

    const closedCheckbox = screen.getByLabelText('Cerrado');
    fireEvent.click(closedCheckbox);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith({
        closed: true,
        slots: []
      });
    });
  });

  it('debe permitir agregar nuevas franjas horarias', async () => {
    render(
      <DayScheduleEditor
        dayName="Lunes"
        dayKey="monday"
        schedule={defaultSchedule}
        onChange={mockOnChange}
      />
    );

    const addButton = screen.getByText('Agregar Franja');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith({
        closed: false,
        slots: [
          { start: '09:00', end: '17:00' },
          { start: '09:00', end: '17:00' }
        ]
      });
    });
  });

  it('debe permitir eliminar franjas horarias', async () => {
    const scheduleWithMultipleSlots: DaySchedule = {
      closed: false,
      slots: [
        { start: '09:00', end: '12:00' },
        { start: '15:00', end: '18:00' }
      ]
    };

    render(
      <DayScheduleEditor
        dayName="Lunes"
        dayKey="monday"
        schedule={scheduleWithMultipleSlots}
        onChange={mockOnChange}
      />
    );

    const deleteButtons = screen.getAllByRole('button', { name: /trash/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith({
        closed: false,
        slots: [{ start: '15:00', end: '18:00' }]
      });
    });
  });

  it('debe validar horarios inválidos', async () => {
    const invalidSchedule: DaySchedule = {
      closed: false,
      slots: [{ start: '17:00', end: '09:00' }] // End < Start
    };

    render(
      <DayScheduleEditor
        dayName="Lunes"
        dayKey="monday"
        schedule={invalidSchedule}
        onChange={mockOnChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/La hora de fin debe ser posterior a la hora de inicio/)).toBeInTheDocument();
    });
  });

  it('debe validar solapamientos entre franjas', async () => {
    const overlappingSchedule: DaySchedule = {
      closed: false,
      slots: [
        { start: '09:00', end: '12:00' },
        { start: '11:00', end: '14:00' } // Se solapa con la primera
      ]
    };

    render(
      <DayScheduleEditor
        dayName="Lunes"
        dayKey="monday"
        schedule={overlappingSchedule}
        onChange={mockOnChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/se solapan/)).toBeInTheDocument();
    });
  });

  it('debe respetar el límite máximo de franjas', () => {
    const maxSlotsSchedule: DaySchedule = {
      closed: false,
      slots: [
        { start: '09:00', end: '10:00' },
        { start: '11:00', end: '12:00' },
        { start: '13:00', end: '14:00' },
        { start: '15:00', end: '16:00' }
      ]
    };

    render(
      <DayScheduleEditor
        dayName="Lunes"
        dayKey="monday"
        schedule={maxSlotsSchedule}
        onChange={mockOnChange}
        maxSlots={4}
      />
    );

    const addButton = screen.getByText('Agregar Franja');
    expect(addButton).toBeDisabled();
  });

  it('debe mostrar mensaje cuando no hay franjas configuradas', () => {
    const emptySchedule: DaySchedule = {
      closed: false,
      slots: []
    };

    render(
      <DayScheduleEditor
        dayName="Lunes"
        dayKey="monday"
        schedule={emptySchedule}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('No hay franjas horarias configuradas')).toBeInTheDocument();
  });

  it('debe mostrar mensaje cuando está cerrado', () => {
    const closedSchedule: DaySchedule = {
      closed: true,
      slots: []
    };

    render(
      <DayScheduleEditor
        dayName="Lunes"
        dayKey="monday"
        schedule={closedSchedule}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Centro cerrado los lunes')).toBeInTheDocument();
  });

  it('debe mostrar estado de validación exitosa', () => {
    const validSchedule: DaySchedule = {
      closed: false,
      slots: [
        { start: '09:00', end: '12:00' },
        { start: '15:00', end: '18:00' }
      ]
    };

    render(
      <DayScheduleEditor
        dayName="Lunes"
        dayKey="monday"
        schedule={validSchedule}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText(/Horario configurado correctamente/)).toBeInTheDocument();
  });

  it('debe manejar estado deshabilitado', () => {
    render(
      <DayScheduleEditor
        dayName="Lunes"
        dayKey="monday"
        schedule={defaultSchedule}
        onChange={mockOnChange}
        disabled={true}
      />
    );

    const inputs = screen.getAllByRole('combobox');
    inputs.forEach(input => {
      expect(input).toBeDisabled();
    });

    const addButton = screen.getByText('Agregar Franja');
    expect(addButton).toBeDisabled();
  });

  it('debe actualizar franjas existentes correctamente', async () => {
    render(
      <DayScheduleEditor
        dayName="Lunes"
        dayKey="monday"
        schedule={defaultSchedule}
        onChange={mockOnChange}
      />
    );

    const startSelect = screen.getByDisplayValue('09:00');
    fireEvent.change(startSelect, { target: { value: '08:00' } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith({
        closed: false,
        slots: [{ start: '08:00', end: '17:00' }]
      });
    });
  });
});



