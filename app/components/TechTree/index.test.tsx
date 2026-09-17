import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '~/../test/test-utils';
import type { SkillGroup } from '~/utils/utils';

import TechTree from './index';

const SAMPLE: SkillGroup[] = [
  { id: 'TECH_GROUP_LANGUAGES', items: ['CSS', 'HTML', 'JavaScript', 'TypeScript'] },
  { id: 'TECH_GROUP_FRAMEWORKS', items: ['React', 'Vue'] },
  { id: 'TECH_GROUP_SOFT', items: ['Mentoring'] },
];

describe('TechTree', () => {
  it('renders one chip per item and one heading per data group + the two forward-looking groups', () => {
    const { container } = renderWithProviders(<TechTree groups={SAMPLE} />);
    const items = container.querySelectorAll('.tech-tree-component__item');
    const groups = container.querySelectorAll('.tech-tree-component__group-title');
    // 4 + 2 + 1 = 7 data chips, plus 1 learning + 1 future = 2 forward chips
    expect(items.length).toBe(7 + 2);
    // 3 data groups + Learning + Future = 5 group titles
    expect(groups.length).toBe(5);
  });

  it('marks forward-looking groups (learning, future) with dashed-chip variant', () => {
    const { container } = renderWithProviders(<TechTree groups={SAMPLE} />);
    const learningChips = container.querySelectorAll('.tech-tree-component__item--learning');
    const futureChips = container.querySelectorAll('.tech-tree-component__item--future');
    expect(learningChips.length).toBeGreaterThan(0);
    expect(futureChips.length).toBeGreaterThan(0);
  });

  it('renders nothing in the data area when groups is empty (forward groups still render)', () => {
    const { container } = renderWithProviders(<TechTree groups={[]} />);
    const groups = container.querySelectorAll('.tech-tree-component__group-title');
    // Only Learning + Future titles
    expect(groups.length).toBe(2);
  });
});
