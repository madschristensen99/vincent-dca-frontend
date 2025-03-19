import { Authentication } from '../components/Authentication';
import Dashboard from './dashboard';

export default function AuthDashboard() {
  return (
    <Authentication>
      <Dashboard />
    </Authentication>
  );
}
