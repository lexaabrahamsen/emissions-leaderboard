import { ActionIcon, Box, useMantineColorScheme } from '@mantine/core';
import { IconMoon, IconSun } from '@tabler/icons-react';
import MantineRoot from './MantineRoot';

function Toggle() {
  const { toggleColorScheme } = useMantineColorScheme();
  return (
    <ActionIcon
      variant="default"
      size="lg"
      // Static label: the saved scheme is only known on the client, so a dynamic one would mismatch SSR.
      aria-label="Toggle light and dark theme"
      onClick={toggleColorScheme}
    >
      {/* Show the icon for the theme you would switch to; CSS picks it so SSR and client agree. */}
      <Box component="span" lightHidden style={{ display: 'flex' }}>
        <IconSun size={18} stroke={1.75} />
      </Box>
      <Box component="span" darkHidden style={{ display: 'flex' }}>
        <IconMoon size={18} stroke={1.75} />
      </Box>
    </ActionIcon>
  );
}

export default function ThemeToggle() {
  return (
    <MantineRoot>
      <Toggle />
    </MantineRoot>
  );
}
