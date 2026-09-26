import ContactSkeleton from '~/components/skeletons/ContactSkeleton';
import EducationDetailSkeleton from '~/components/skeletons/EducationDetailSkeleton';
import EducationSkeleton from '~/components/skeletons/EducationSkeleton';
import HomeSkeleton from '~/components/skeletons/HomeSkeleton';
import ProjectDetailSkeleton from '~/components/skeletons/ProjectDetailSkeleton';
import ProjectsSkeleton from '~/components/skeletons/ProjectsSkeleton';
import SkillsDetailSkeleton from '~/components/skeletons/SkillsDetailSkeleton';
import SkillsSkeleton from '~/components/skeletons/SkillsSkeleton';

// Path → skeleton element. Matched top-down so detail routes ("/skills/1")
// win over the index ("/skills"). Falls back to the HomeSkeleton for any
// unknown path — better than showing a spinner or nothing.
//
// Returns rendered JSX (not the component reference) so the caller
// doesn't create a component during render — sidesteps the
// react-hooks/static-components lint that reasonably objects to
// dynamic component identity across renders.
const RULES: Array<{ test: (p: string) => boolean; render: () => React.ReactElement | null }> = [
  // /admin/* has no skeleton of its own yet and definitely shouldn't
  // borrow the public HomeSkeleton — render nothing and let the
  // outgoing content stay put until the loader resolves.
  { test: (p) => p === '/admin' || p.startsWith('/admin/'), render: () => null },
  { test: (p) => p === '/', render: () => <HomeSkeleton /> },
  { test: (p) => /^\/education\/[^/]+$/.test(p), render: () => <EducationDetailSkeleton /> },
  { test: (p) => p === '/education', render: () => <EducationSkeleton /> },
  { test: (p) => /^\/skills\/[^/]+$/.test(p), render: () => <SkillsDetailSkeleton /> },
  { test: (p) => p === '/skills', render: () => <SkillsSkeleton /> },
  { test: (p) => /^\/projects\/[^/]+$/.test(p), render: () => <ProjectDetailSkeleton /> },
  { test: (p) => p === '/projects', render: () => <ProjectsSkeleton /> },
  { test: (p) => p === '/contact', render: () => <ContactSkeleton /> },
];

export function renderSkeleton(pathname: string): React.ReactElement | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  for (const rule of RULES) {
    if (rule.test(path)) return rule.render();
  }
  return <HomeSkeleton />;
}
