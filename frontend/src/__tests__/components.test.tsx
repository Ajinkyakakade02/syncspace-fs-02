import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/Badge';
import { Avatar } from '../components/common/Avatar';

describe('Frontend UI Component Unit Tests', () => {
  it('renders Button component with variant and loading state', () => {
    const { rerender } = render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeDefined();

    rerender(<Button isLoading>Click Me</Button>);
    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('renders StatusBadge with accurate real-time statuses', () => {
    const { rerender } = render(<StatusBadge status="connected" />);
    expect(screen.getByText('Synced')).toBeDefined();

    rerender(<StatusBadge status="connecting" />);
    expect(screen.getByText('Connecting...')).toBeDefined();

    rerender(<StatusBadge status="offline" />);
    expect(screen.getByText('Offline')).toBeDefined();

    rerender(<StatusBadge status="error" />);
    expect(screen.getByText('Sync Error')).toBeDefined();
  });

  it('renders Avatar with user initials and custom cursor color', () => {
    render(<Avatar name="Alice Cooper" color="#3b82f6" />);
    const avatar = screen.getByTitle('Alice Cooper');
    expect(avatar).toBeDefined();
    expect(avatar.textContent).toBe('AC');
  });
});
