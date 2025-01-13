import { useEffect, useState } from 'react';
import { Table, IconButton, Text, Card, Badge } from "@radix-ui/themes";
import { GameResult } from '../models/gameResults.model';
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { leaderboardService } from '../services/leaderboard.service';

import { useAuth } from '../context/auth.context';
import Loading from '../components/loading';

const Profile = () => {
    const { user } = useAuth();
    const [leaderboardStats, setLeaderboardStats] = useState<any>(null);
    const [gameResults, setGameResults] = useState<GameResult[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [resultsPerPage] = useState(10);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) {
                setError('User not found');
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const statsResponse = await leaderboardService.getUserStats(user.id);
                if (statsResponse.success && statsResponse.stats) {
                    setLeaderboardStats(statsResponse.stats);
                } else {
                    setError(statsResponse.message || 'Failed to fetch stats');
                }
                const resultsResponse = await leaderboardService.getAllGameResults(user.id, currentPage);
                if (resultsResponse.success && resultsResponse.results) {
                    setGameResults(resultsResponse.results);
                } else {
                    setError(resultsResponse.message || 'Failed to fetch game results');
                }
            } catch {
                setError('An error occurred');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user, currentPage]);

    if (loading) return <Loading />;
    if (error || !user) return <div>Error: {error}</div>;

    return (
        <div className="container mx-auto p-8">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <h1 style={{ fontFamily: 'Special Elite' }} className="text-xl md:text-3xl font-bold mb-4">
                        Profile
                    </h1>
                    <div className="mb-3 text-sm md:text-base">
                        <p><strong>Username:</strong> {user.username}</p>
                        <p><strong>Email:</strong> {user.email}</p>
                    </div>
                </div>
                <div className="flex-1">
                    <h2 style={{ fontFamily: 'Special Elite' }} className="text-xl md:text-3xl font-bold mb-4">
                        Leaderboard Stats
                    </h2>
                    {leaderboardStats ? (
                        <div className="mb-3 text-sm md:text-base">
                            <p><strong>ELO:</strong> {leaderboardStats.elo}</p>
                            <p><strong>Single Wins:</strong> {leaderboardStats.single_wins}</p>
                            <p><strong>Multi Wins:</strong> {leaderboardStats.multi_wins}</p>
                        </div>
                    ) : (
                        <div>No stats available.</div>
                    )}
                </div>
            </div>

            <h2 style={{ fontFamily: 'Special Elite' }} className="text-xl md:text-3xl font-bold mt-8 mb-4">
                Game Results
            </h2>
            {gameResults.length > 0 ? (
                <div className="rounded-lg shadow">
                    <Table.Root variant="surface">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell>Game Room</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Result</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Rating Change</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Badges</Table.ColumnHeaderCell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {gameResults.map((result, index) => (
                                <Table.Row key={index}>
                                    <Table.Cell>{result.game_room_id}</Table.Cell>
                                    <Table.Cell>{result.won ? 'Won' : 'Lost'}</Table.Cell>
                                    <Table.Cell>
                                        {result.new_rating} ({result.new_rating - result.old_rating > 0 ? `+${result.new_rating - result.old_rating}` : result.new_rating - result.old_rating})
                                    </Table.Cell>
                                    <Table.Cell>
                                        {result.badges.map((badge, idx) => (
                                            <Badge key={idx} className="ml-1 badge">
                                                {badge.badge}
                                            </Badge>
                                        ))}
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                    <Card className="flex items-center justify-between p-4 mt-4">
                        <Text>
                            Showing {(currentPage - 1) * resultsPerPage + 1} to {currentPage * resultsPerPage}
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
                                disabled={gameResults.length < resultsPerPage}
                            >
                                <FaChevronRight className="h-4 w-4" />
                            </IconButton>
                        </div>
                    </Card>
                </div>
            ) : (
                <div>No game results available.</div>
            )}
        </div>
    );
};

export default Profile;