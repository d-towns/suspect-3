import { useEffect, useState } from 'react';
import { Table, IconButton, Text, Card, Badge, Flex, Heading } from "@radix-ui/themes";
import { GameResult } from '../models/gameResults.model';
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { leaderboardService } from '../services/leaderboard.service';
import { subscriptionsService } from '../services/subscriptions.service';
import { useAuth } from '../context/auth.context';
import Loading from '../components/loading';

const Profile = () => {
    const { user } = useAuth();
    const [leaderboardStats, setLeaderboardStats] = useState<any>(null);
    const [gameResults, setGameResults] = useState<GameResult[]>([]);
    const [gameCredits, setGameCredits] = useState<number>(0);
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
                
                // Fetch user stats
                const statsResponse = await leaderboardService.getUserStats(user.id);
                if (statsResponse.success && Array.isArray(statsResponse.stats)) {
                    setLeaderboardStats(statsResponse.stats[0]);
                } else {
                    setError(statsResponse.message || 'Failed to fetch stats');
                }
                
                // Fetch game results
                const resultsResponse = await leaderboardService.getAllGameResults(user.id, currentPage);
                if (resultsResponse.success && resultsResponse.results) {
                    setGameResults(resultsResponse.results);
                } else {
                    setError(resultsResponse.message || 'Failed to fetch game results');
                }
                
                // Fetch game credits
                const credits = await subscriptionsService.getGameCredits(user.id);
                setGameCredits(credits);
                
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
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                        <Card>
                            <Flex direction="column" gap="3" p="3">
                                <Heading size="4">Account Details</Heading>
                                <Flex direction="column" gap="2">
                                    <Text>Username: {user.username || user.email}</Text>
                                    <Text>Email: {user.email}</Text>
                                    <Text weight="bold">Game Credits: {gameCredits}</Text>
                                </Flex>
                                {gameCredits < 5 && (
                                    <Text size="2" color="orange">
                                        Running low on credits? <a href="/subscriptions" className="text-blue-500 hover:underline">Get more from our subscription plans</a>
                                    </Text>
                                )}
                            </Flex>
                        </Card>
                        
                        <Card>
                            <Flex direction="column" gap="3" p="3">
                                <Heading size="4">Game Statistics</Heading>
                                <Flex direction="column" gap="2">
                                    <Text>Rating: {leaderboardStats?.rating || 0}</Text>
                                    <Text>Games Played: {leaderboardStats?.games_played || 0}</Text>
                                    <Text>Win Rate: {leaderboardStats?.win_rate ? `${(leaderboardStats.win_rate * 100).toFixed(1)}%` : '0%'}</Text>
                                </Flex>
                            </Flex>
                        </Card>
                    </div>
                    
                    <h2 style={{ fontFamily: 'Special Elite' }} className="text-lg md:text-2xl font-bold mb-4">
                        Game History
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
            </div>
        </div>
    );
};

export default Profile;