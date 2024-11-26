import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth.context';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
            <Link to="/home" className="text-white font-bold hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm">
                Suspect 3
            </Link>
            </div>
            <div className="ml-10 flex items-baseline space-x-4">
              <Link to="/play" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                Play
              </Link>
            </div>
            <div className="ml-10 flex items-baseline space-x-4">
              <Link to="/faq" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                How To Play
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            {user && (
              <span className="text-gray-300 mr-4">
                Logged in as: {user.email}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;