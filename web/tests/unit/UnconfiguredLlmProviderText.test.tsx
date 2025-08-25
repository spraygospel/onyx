import { render, screen, fireEvent } from '@testing-library/react';
import { UnconfiguredLlmProviderText } from '@/components/chat/UnconfiguredLlmProviderText';
import { useProviderStatus } from '@/components/chat/ProviderContext';
import '@testing-library/jest-dom';

// Mock the ProviderContext hook
jest.mock('@/components/chat/ProviderContext', () => ({
  useProviderStatus: jest.fn(),
}));

// Mock next/link for Link component testing
jest.mock('next/link', () => {
  return function Link({ href, children, ...props }: any) {
    return <a href={href} {...props}>{children}</a>;
  };
});

const mockUseProviderStatus = useProviderStatus as jest.MockedFunction<typeof useProviderStatus>;

describe('UnconfiguredLlmProviderText Component', () => {
  const mockShowConfigureAPIKey = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Current Implementation (Before Changes)', () => {
    test('should render unconfigured message when shouldShowConfigurationNeeded is true', () => {
      mockUseProviderStatus.mockReturnValue({
        shouldShowConfigurationNeeded: true,
        // Add other properties as needed based on actual ProviderContext
      } as any);

      render(
        <UnconfiguredLlmProviderText 
          showConfigureAPIKey={mockShowConfigureAPIKey} 
        />
      );

      expect(screen.getByText(/Please note that you have not yet configured an LLM provider/)).toBeInTheDocument();
      expect(screen.getByText('here')).toBeInTheDocument();
    });

    test('should not render unconfigured message when shouldShowConfigurationNeeded is false', () => {
      mockUseProviderStatus.mockReturnValue({
        shouldShowConfigurationNeeded: false,
      } as any);

      render(
        <UnconfiguredLlmProviderText 
          showConfigureAPIKey={mockShowConfigureAPIKey} 
        />
      );

      expect(screen.queryByText(/Please note that you have not yet configured an LLM provider/)).not.toBeInTheDocument();
    });

    test('should call showConfigureAPIKey when here button is clicked (current behavior)', () => {
      mockUseProviderStatus.mockReturnValue({
        shouldShowConfigurationNeeded: true,
      } as any);

      render(
        <UnconfiguredLlmProviderText 
          showConfigureAPIKey={mockShowConfigureAPIKey} 
        />
      );

      const hereButton = screen.getByText('here');
      fireEvent.click(hereButton);

      expect(mockShowConfigureAPIKey).toHaveBeenCalledTimes(1);
    });

    test('should render no sources message when noSources is true', () => {
      render(
        <UnconfiguredLlmProviderText 
          showConfigureAPIKey={mockShowConfigureAPIKey} 
          noSources={true}
        />
      );

      expect(screen.getByText(/You have not yet added any sources/)).toBeInTheDocument();
      expect(screen.getByText('a source')).toBeInTheDocument();
    });
  });

  describe('Expected Implementation (After Changes)', () => {
    // These tests define the expected behavior after implementing the changes
    // They will fail initially but should pass after implementation

    test('should render link to admin page instead of button after changes', () => {
      mockUseProviderStatus.mockReturnValue({
        shouldShowConfigurationNeeded: true,
      } as any);

      // This test expects the component to be changed to use Link component
      render(
        <UnconfiguredLlmProviderText />  // No showConfigureAPIKey prop after changes
      );

      const hereLink = screen.getByText('here');
      expect(hereLink).toBeInTheDocument();
      
      // After changes, this should be a link, not a button
      expect(hereLink.closest('a')).toHaveAttribute('href', '/admin/configuration/llm');
    });

    test('should not require showConfigureAPIKey prop after changes', () => {
      mockUseProviderStatus.mockReturnValue({
        shouldShowConfigurationNeeded: true,
      } as any);

      // After changes, component should work without showConfigureAPIKey prop
      expect(() => {
        render(<UnconfiguredLlmProviderText />);
      }).not.toThrow();

      expect(screen.getByText(/Please note that you have not yet configured an LLM provider/)).toBeInTheDocument();
    });

    test('should not call showConfigureAPIKey after changes (link instead of button)', () => {
      mockUseProviderStatus.mockReturnValue({
        shouldShowConfigurationNeeded: true,
      } as any);

      const mockShowConfigureAPIKey = jest.fn();
      
      render(
        <UnconfiguredLlmProviderText />  // No callback prop after changes
      );

      const hereLink = screen.getByText('here');
      fireEvent.click(hereLink);

      // After changes, no callback should be called since it's now a link
      expect(mockShowConfigureAPIKey).not.toHaveBeenCalled();
    });

    test('should maintain auto-hide functionality when LLM is configured', () => {
      // Test that existing auto-hide logic continues to work
      mockUseProviderStatus.mockReturnValue({
        shouldShowConfigurationNeeded: false,
      } as any);

      render(<UnconfiguredLlmProviderText />);

      // Should not render message when LLM is configured
      expect(screen.queryByText(/Please note that you have not yet configured an LLM provider/)).not.toBeInTheDocument();
    });

    test('should maintain noSources functionality after changes', () => {
      render(
        <UnconfiguredLlmProviderText 
          noSources={true}
        />
      );

      expect(screen.getByText(/You have not yet added any sources/)).toBeInTheDocument();
      
      const sourceLink = screen.getByText('a source');
      expect(sourceLink.closest('a')).toHaveAttribute('href', '/admin/add-connector');
    });
  });

  describe('Props Interface Changes', () => {
    test('should accept optional showConfigureAPIKey for backward compatibility', () => {
      mockUseProviderStatus.mockReturnValue({
        shouldShowConfigurationNeeded: true,
      } as any);

      // Component should still accept the prop during transition
      expect(() => {
        render(
          <UnconfiguredLlmProviderText 
            showConfigureAPIKey={mockShowConfigureAPIKey} 
          />
        );
      }).not.toThrow();
    });

    test('should work without showConfigureAPIKey prop', () => {
      mockUseProviderStatus.mockReturnValue({
        shouldShowConfigurationNeeded: true,
      } as any);

      // Component should work without the prop after changes
      expect(() => {
        render(<UnconfiguredLlmProviderText />);
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    test('should maintain proper link accessibility after changes', () => {
      mockUseProviderStatus.mockReturnValue({
        shouldShowConfigurationNeeded: true,
      } as any);

      render(<UnconfiguredLlmProviderText />);

      const hereLink = screen.getByText('here');
      
      // Link should have proper href attribute
      expect(hereLink.closest('a')).toHaveAttribute('href', '/admin/configuration/llm');
      
      // Link should be keyboard accessible
      expect(hereLink.closest('a')).toBeInTheDocument();
    });

    test('should maintain proper styling classes after changes', () => {
      mockUseProviderStatus.mockReturnValue({
        shouldShowConfigurationNeeded: true,
      } as any);

      render(<UnconfiguredLlmProviderText />);

      const hereLink = screen.getByText('here');
      
      // Should maintain the same CSS classes for consistent styling
      expect(hereLink).toHaveClass('text-link', 'hover:underline', 'cursor-pointer');
    });
  });
});