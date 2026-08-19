import { ProjectsClient } from '@/components/projects/ProjectsClient';

export const metadata = { title: '项目与密钥' };
export const dynamic = 'force-dynamic';

export default function ProjectsPage() {
  return <ProjectsClient />;
}
