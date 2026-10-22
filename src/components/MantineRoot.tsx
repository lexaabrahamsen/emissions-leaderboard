import { createTheme, MantineProvider, type MantineColorsTuple } from '@mantine/core';
import type { ReactNode } from 'react';

// Ten-step ramp around the site accent (#b5401f light / #f0805c dark), light → dark.
const ember: MantineColorsTuple = [
  '#fdf1ec', '#fbe0d4', '#f7c1ab', '#f4a183', '#f0805c',
  '#d4603c', '#b5401f', '#96340f', '#7a2a0e', '#5c1f0a',
];

const theme = createTheme({
  primaryColor: 'ember',
  colors: { ember },
  primaryShade: { light: 6, dark: 4 },
  autoContrast: true, // dark text on the bright dark-mode accent, white on the deep light-mode one
  fontFamily: "'Inter Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  defaultRadius: 'md',
  headings: { fontWeight: '600' },
});

/** Every React island is its own tree, so each one wraps itself in this provider. */
export default function MantineRoot({ children }: { children: ReactNode }) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      {children}
    </MantineProvider>
  );
}
