import { Link } from 'react-router-dom';
import TopBar from '../../components/layout/TopBar';
import Card from '../../components/ui/Card';

const tiles = [
  {
    to: '/admin/users',
    title: 'Users',
    description: 'Manage teachers, operators and admins',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    to: '/admin/institutions',
    title: 'Institutions',
    description: 'Schools, faculties, departments, classes & courses',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  },
  {
    to: '/admin/assignments',
    title: 'Assignments',
    description: 'Assign teachers to class and course pairs',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  },
];

export default function AdminDashboard() {
  return (
    <div>
      <TopBar title="Admin Dashboard" />
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tiles.map((tile) => (
            <Link key={tile.to} to={tile.to} className="block group">
              <Card className="hover:border-primary transition-colors h-full">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary-light flex items-center justify-center">
                    <svg
                      className="h-5 w-5 text-primary"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d={tile.icon} />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                      {tile.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{tile.description}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
