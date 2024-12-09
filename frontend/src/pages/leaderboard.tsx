import React, { useState, useEffect } from 'react';
import { 
    Table,
    Button,
    IconButton,
    Text,
    Card,
} from "@radix-ui/themes";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import {leaderboardService} from '../services/leaderboard.service';

interface Player {
    id: number;
    username: string;
    elo: number;
    singlePlayerWins: number;
    multiPlayerWins: number;
}

const Leaderboard = () => {
    const [currentPage, setCurrentPage] = useState(1);
    
    const playersPerPage = 50;

    const [players, setPlayers] = useState<Player[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
    const fetchLeaderboard = async () => {
        console.log('Fetching leaderboard');
        try {
            setLoading(true);
            const response = await leaderboardService.getLeaderboard(currentPage);
            console.log('response:', response); 
            if (response.success && response.leaderboard) {
                const formattedPlayers = response.leaderboard.map(entry => ({
                    id: entry.id,
                    username: entry.username,
                    elo: entry.elo,
                    singlePlayerWins: entry.single_wins,
                    multiPlayerWins: entry.multi_wins
                }));
                setPlayers(formattedPlayers);
            } else {
                setError(response.message || 'Failed to fetch leaderboard');
            }
        } catch (err) {
            setError('Failed to fetch leaderboard');
        } finally {
            setLoading(false);
        }
    };

    fetchLeaderboard();
}, [currentPage]);


    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6">Leaderboard</h1>
            
            <div className="rounded-lg shadow">
                <Table.Root variant="surface">
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeaderCell className="w-16">Rank</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Username</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>ELO</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Single Player Wins</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Multiplayer Wins</Table.ColumnHeaderCell>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {players.map((player, index) => (
                            <Table.Row key={player.id}>
                                <Table.Cell className="font-medium">{index + 1  + ((currentPage -1)  * playersPerPage)}</Table.Cell>
                                <Table.Cell>{player.username}</Table.Cell>
                                <Table.Cell>{player.elo}</Table.Cell>
                                <Table.Cell>{player.singlePlayerWins}</Table.Cell>
                                <Table.Cell>{player.multiPlayerWins}</Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>

                <Card className="flex items-center justify-between p-4 mt-5">
                    <Text>
                        Showing {currentPage * playersPerPage - playersPerPage + 1} to {currentPage * playersPerPage}
                    </Text>
                    
                    <div className="flex items-center gap-2">
                        <IconButton
                            variant="outline"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            <FaChevronLeft className="h-4 w-4" />
                        </IconButton>
                        
                        <IconButton
                            variant="outline"
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            disabled={players.length < playersPerPage}
                        >
                            <FaChevronRight className="h-4 w-4" />
                        </IconButton>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Leaderboard;