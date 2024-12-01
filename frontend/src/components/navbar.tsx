import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth.context';
import { invitesService } from '../services/invites.service';
import { Invite } from '../models/invite.model';
import moment from 'moment';
import InvitesDropdown from './InvitesDropdown';
import ProfileDropdown from './ProfileDropdown';
import { useSocket } from '../hooks/useSocket';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [invites, setInvites] = useState<Invite[]>([]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };


  useEffect(() => {
    const fetchInvites = async () => {
      if (user) {
        const userInvites = await invitesService.getInvites(user.email);
        setInvites(userInvites);
        // Log expired invites
        userInvites.forEach(invite => {
          const inviteExpiration = moment.utc(invite.expires_at);
          const currentTime = moment.utc();
          const isExpired = inviteExpiration.isBefore(currentTime);
          if (isExpired) {
            console.log(`Invite ${invite.id} is expired`);
          }
        });
      }
    };
    fetchInvites();
  }, [user]);

  return (
    <nav className="bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/home" className="text-white text-2xl font-bold hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-left">
            Suspect 3
          </Link>
          <div className="flex items-center gap-10">
            <div className="flex-shrink-0 ">
            </div>
            <div className="flex items-baseline space-x-4">
              <Link to="/play" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md font-medium">
                Play
              </Link>
            </div>
            <div className="flex items-baseline space-x-4">
              <Link to="/faq" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md font-medium">
                How To Play
              </Link>
            </div>
            {user && (
              <>
                <div className="relative">
                  <InvitesDropdown invites={invites} />
                </div>
                <ProfileDropdown logout={handleLogout} email={user.email} />
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;