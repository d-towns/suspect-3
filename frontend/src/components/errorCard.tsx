import React from 'react';
import { Card, Flex, Button } from '@radix-ui/themes';
import { useNavigate } from 'react-router-dom';

interface ErrorCardProps {
    error: string;
}

const ErrorCard: React.FC<ErrorCardProps> = ({ error }) => {
    const navigate = useNavigate();

    return (
        <Flex justify="center" align="center" style={{ height: '100vh' }}>
            <Card>
                <h2>Error</h2>
                <p>{error}</p>
                <Button onClick={() => navigate('/')}>Go Back</Button>
            </Card>
        </Flex>
    );
};

export default ErrorCard;