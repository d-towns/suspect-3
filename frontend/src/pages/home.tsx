import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
    return (
        <div className="relative flex flex-col items-center justify-center h-screen bg-white text-white">
            <div className="absolute inset-0">
                <img src="home-splash.webp" alt="splash" className="w-full h-full object-cover opacity-60" />
            </div>
            <div className="relative z-10">
                <h1 className="text-4xl text-black text-center font-bold mb-8">Suspect 3</h1>
                <div className="flex gap-4 items-center w-full">
                    <Link
                        to="/play"
                        className="group relative w-48 flex justify-center py-4 px-6 border border-transparent text-2xl font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 hover:border-white hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                    >
                        Play
                    </Link>
                    <Link
                        to="/faq"
                        className="group relative w-48 flex justify-center py-4 px-6 border border-transparent text-2xl font-medium rounded-md text-white bg-green-600 hover:bg-green-700 hover:border-white hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all"
                    >
                        How To Play
                    </Link>
                    <Link
                        to="/report-bug"
                        className="group relative w-48 flex justify-center py-4 px-6 border border-transparent text-2xl font-medium rounded-md text-white bg-red-600 hover:bg-red-700 hover:border-white hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all"
                    >
                        Report a Bug
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Home;