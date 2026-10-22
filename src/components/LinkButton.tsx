import { Button } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import MantineRoot from './MantineRoot';

/** A Mantine button rendered as a link. Used from .astro pages without hydration. */
export default function LinkButton({ href, children }: { href: string; children: string }) {
  return (
    <MantineRoot>
      <Button component="a" href={href} size="md" rightSection={<IconArrowRight size={18} />}>
        {children}
      </Button>
    </MantineRoot>
  );
}
