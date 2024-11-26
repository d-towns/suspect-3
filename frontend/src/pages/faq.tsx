import React from 'react';

const FAQ: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-8">How to Play Suspect 3</h1>
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold mb-4">Game Overview</h2>
                    <p className="mb-4">
                        Suspect 3 is a web-based game where each player is assigned an identity and 3 out of the 6 pieces of evidence related to their case. Players have 5 minutes to convince the interrogator (a ChatGPT assistant) that they are not the one who committed the crime.
                    </p>
                    <p className="mb-4">
                        Each player enters the room one at a time and does not know what the other players have said. However, the interrogator knows all the stories and can point out inconsistencies.
                    </p>
                    <p className="mb-4">
                        The interrogator uses an algorithm that moves a float from 0.01 (innocent) to 1.00 (guilty). The game is won if the average score of the team is less than 0.30.
                    </p>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg mt-6">
                    <h2 className="text-2xl font-bold mb-4">How to Play</h2>
                    <ol className="list-decimal list-inside mb-4">
                        <li className="mb-2">Join a game room and wait for the game to start.</li>
                        <li className="mb-2">Once the game starts, you will be assigned an identity and 3 pieces of evidence.</li>
                        <li className="mb-2">When it's your turn, enter the room and interact with the interrogator.</li>
                        <li className="mb-2">Use the evidence and your identity to convince the interrogator of your innocence.</li>
                        <li className="mb-2">After all players have been interrogated, the results will be calculated.</li>
                        <li className="mb-2">The game is won if the average guilt score of the team is less than 0.30.</li>
                    </ol>
                </div>
            </div>
        </div>
    );
};

export default FAQ;